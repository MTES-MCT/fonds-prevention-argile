# ADR-0030 : Granularité adaptée pour les events Matomo du dashboard (anti-timeout)

**Date** : 2026-09-07
**Statut** : Accepté

## Contexte

Le dashboard `/administration` (tableau de bord + acquisition) affiche deux KPI alimentés par
Matomo : « visiteurs uniques » et « simulations éligibles / terminées ». Les timeouts et
lenteurs remontés se produisent surtout au changement de filtre département et sur les longues
périodes (12 mois, tout).

Une optimisation précédente (`getGranulariteForPeriode`, cf. gotcha CLAUDE.md) adapte déjà
`period=day/week/month` selon la durée pour le **graphique de visites**
(`VisitsSummary.getVisits`). L'audit de cette session a montré que cette optimisation ne couvre
**pas** les deux KPI cités : `VisitsSummary.get` (visiteurs uniques), `Events.getAction`
(simulations) et `CustomDimensions.getCustomDimension` utilisaient tous `period=range` sans
exception, quelle que soit la durée choisie.

`period=range` n'est **jamais pré-archivé** par Matomo (contrairement à `day`/`week`/`month`,
pré-calculés par le cron d'archivage Matomo) : chaque appel est recalculé en live à partir des
logs bruts. Combiné à un **segment** département (`dimensionX==code`), c'est la requête la plus
coûteuse que Matomo puisse exécuter — exactement ce qui se déclenche à chaque changement de
département. Le cache applicatif (`unstable_cache`, 1h) inclut le `segment` dans sa clé : changer
de département est donc systématiquement un cache miss, qui retombe sur ce calcul live.

## Décision

> Pour les comptages Matomo **additifs** (events, dont « simulations éligibles/terminées »), on
> remplace `period=range` par la même granularité adaptée `day`/`week`/`month` que le graphique
> de visites (`getGranulariteForPeriode`, désormais exportée et réutilisée), puis on **somme** les
> sous-périodes retournées par Matomo. Pour « visiteurs uniques » (dédoublonnage, **non additif**),
> on garde `period=range` inchangé côté code — la piste retenue pour le rendre rapide sans perdre
> l'exactitude est de déclarer les segments département dans Matomo avec archivage en tâche de
> fond (configuration Matomo, hors du code applicatif, cf. Migration). Un cache négatif des échecs
> a été envisagé puis **écarté** : un premier timeout côté appli n'interrompt pas l'archivage
> Matomo en tâche de fond, et l'usage observé consiste justement à réessayer un peu plus tard une
> fois l'archive prête — un échec mis en cache aurait bloqué ce contournement pendant toute sa
> durée de vie (cf. Options, D bis).

## Options envisagées

### Option A — Granularité adaptée + somme pour les comptages additifs (retenue)

- Avantages : réutilise le pattern déjà en place et éprouvé (`getGranulariteForPeriode`) ; lit des
  archives Matomo pré-calculées au lieu de forcer un calcul live ; **aucune perte de précision**
  pour un comptage d'events (`nb_visits` par label est additif par construction, sommer des
  sous-périodes donne le même total qu'un `range` direct).
- Inconvénients : nécessite de parser un format de réponse Matomo différent selon la période
  (tableau plat en `range`, objet keyed par sous-période en `day`/`week`/`month` sur une plage) —
  géré par `sumEventCounts` dans l'adapter. Piège rencontré en préprod : sur ce format
  multi-sous-période, Matomo sérialise `nb_visits` en **string** (contrairement au tableau plat
  `range`, déjà numérique) — une première version sommait sans conversion, produisant une
  concaténation de texte (`0 + "234"` → `"0234"`) au lieu d'un total ; corrigé avec `Number(...)`
  systématique (`sumEventCounts` et `getMatomoStatistiques`, même précaution appliquée par
  cohérence au graphique de visites qui partage le même format de réponse).

### Option B — Même traitement (approximation additive) pour les visiteurs uniques

- Avantages : uniformise le traitement, gain de performance immédiat sans dépendance externe.
- Inconvénients : un visiteur revenant sur plusieurs jours dans la période serait compté plusieurs
  fois (le dédoublonnage Matomo n'est valable qu'à l'intérieur d'une même requête). Change le sens
  du chiffre affiché. **Rejetée après retour explicite de l'utilisateur** : préférence pour garder
  l'exactitude et résoudre la performance côté Matomo plutôt que d'approximer la métrique.

### Option C — Segments département pré-archivés côté Matomo (retenue pour les visiteurs uniques, non encore implémentée)

- Avantages : Matomo archive lui-même (cron `core:archive`) les segments enregistrés avec
  l'option « process in the background » — les requêtes, y compris `period=range`, deviennent des
  lectures d'archives déjà calculées au lieu d'un calcul live. Aucune perte de précision, cohérent
  avec le comportement observé en naviguant directement dans l'UI Matomo (déjà rapide, car les
  segments y sont pré-archivés).
- Inconvénients : configuration côté administration Matomo (déclarer un segment par département,
  ~100 segments), hors du périmètre du code applicatif — nécessite un accès admin Matomo, non
  disponible dans cette session.

### Option D — Cron applicatif de pré-chauffe (écartée pour l'instant)

- Avantages : reste dans le code de l'appli (même pattern que le cron de sync parcours), pas
  besoin d'accès admin Matomo.
- Inconvénients : réinvente ce que Matomo sait déjà faire nativement (Option C) ; nécessiterait de
  couvrir combinatoirement période × département pour rester efficace. Écartée au profit de
  l'option C, plus robuste et moins de code applicatif à maintenir.

### Option D bis — Cache négatif sur échec (envisagée, écartée)

- Avantages : évite de retenter le même appel coûteux et de rattendre le timeout de 10 s à chaque
  requête suivante pendant la fenêtre de cache.
- Inconvénients : **casse le contournement utilisateur observé en production**. Un premier timeout
  côté appli (au bout de 10 s) n'arrête pas Matomo, qui continue de calculer/stocker l'archive en
  tâche de fond ; un nouvel essai quelques minutes plus tard réussit alors souvent directement,
  l'archive étant prête entretemps — c'est précisément ce que fait l'utilisateur aujourd'hui
  (changer de filtre puis revenir). Mettre l'échec en cache aurait servi cet échec obsolète pendant
  toute la durée du cache, empêchant cette réussite différée. **Rejetée après retour explicite de
  l'utilisateur.**

## Conséquences

### Positives

- « Simulations éligibles / terminées » ne déclenche plus de calcul `range` segmenté : gain de
  performance immédiat, sans risque de régression sur le chiffre affiché (comptage additif).
- Les échecs restent non mis en cache (comportement préexistant conservé) : un nouvel essai après
  un timeout peut réussir dès que l'archive Matomo, calculée en tâche de fond, est prête — sans
  attendre l'expiration d'un cache d'échec.

### Négatives / Risques

- « Visiteurs uniques » reste potentiellement lent sur département + longue période tant que
  l'option C (segments pré-archivés Matomo) n'est pas mise en place côté administration Matomo —
  reste une dépendance externe hors du code applicatif.
- Sans cache négatif, un filtre qui timeout de façon persistante (archive jamais prête) continue de
  rattendre le timeout de 10 s à chaque nouvelle tentative — accepté comme préférable au risque de
  bloquer un contournement qui fonctionne.

### Migration (si applicable)

Pour rendre « visiteurs uniques » rapide sans changer sa sémantique (option C, suivi) : dans
l'administration Matomo, déclarer un segment par département (`dimensionX==code`) avec l'option
« Traiter ce rapport en tâche de fond également » activée, pour que le cron d'archivage Matomo
les pré-calcule. Action côté ops/admin Matomo, hors du code applicatif.

## Liens

- `src/features/backoffice/administration/acquisition/adapters/matomo-api.adapter.ts` —
  `sumEventCounts`, `fetchMatomoApiCached` (cache des seuls succès, inchangé)
- `src/features/backoffice/administration/acquisition/services/matomo.service.ts` —
  `getGranulariteForPeriode` (exportée, réutilisée)
- `src/features/backoffice/administration/tableau-de-bord/services/tableau-de-bord.service.ts` —
  `getSimulationsMatomo` (granularité adaptée), `getUniqueVisitors` (inchangé, `period=range`)
- CLAUDE.md, section Gotchas — mitigation Matomo existante (`getGranulariteForPeriode` pour le
  graphique de visites, désormais élargie aux events)
