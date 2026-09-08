# ADR-0033 : Granularité adaptée pour les events Matomo du dashboard (anti-timeout)

**Date** : 2026-09-07 (amendé le 2026-09-08)
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

Matomo ne pré-archive `period=range` que si `archiving_custom_ranges` est activé — ce qui n'est
pas le défaut. Sur notre instance, un `range` est donc recalculé à la demande, et combiné à un
**segment** département (`dimensionX==code`) il déclenche le calcul le plus coûteux que Matomo
puisse avoir à faire : exactement ce qui se produit à chaque changement de département. Le cache
applicatif (`unstable_cache`, 1 h) inclut le `segment` dans sa clé, donc changer de département
est systématiquement un cache miss qui retombe sur ce calcul.

## Décision

> Pour les comptages Matomo **additifs** (events, dont « simulations éligibles/terminées »), on
> remplace `period=range` par la granularité adaptée `day`/`week`/`month`
> (`getGranulariteForPeriode`, désormais exportée et réutilisée), puis on **somme** les
> sous-périodes. La fenêtre demandée est au préalable **découpée en plages alignées sur les
> bornes de bucket** (`decouperPeriodeMatomo`), sans quoi la somme ne porterait pas sur la
> période demandée (cf. Options, A bis). Pour « visiteurs uniques » (dédoublonnage, **non
> additif**), on garde `period=range` inchangé côté code — la piste retenue pour le rendre
> rapide sans perdre l'exactitude est de déclarer les segments département dans Matomo avec
> archivage en tâche de fond (configuration Matomo, hors du code applicatif, cf. Migration). Un
> cache négatif des échecs a été envisagé puis **écarté** (cf. Options, D bis).

## Options envisagées

### Option A — Granularité adaptée + somme pour les comptages additifs (retenue)

- Avantages : réutilise le pattern déjà en place (`getGranulariteForPeriode`) ; lit des archives
  Matomo que le cron pré-calcule au lieu de déclencher un calcul à la demande.
- Conditions d'exactitude, à ne pas sous-entendre : le total n'égale celui d'un `range` que si
  les sous-périodes couvrent **exactement** les mêmes journées, sans recouvrement, sous le même
  segment, et si la réponse est complète. `nb_visits` d'un event est un comptage de visites,
  additif entre journées disjointes ; ni les taux ni les visiteurs uniques n'héritent de cette
  propriété.
- Inconvénients : la réponse Matomo change de forme selon la période (tableau plat en `range`,
  objet indexé par sous-période sinon) — géré par `sumEventCounts`. Piège rencontré en préprod :
  sur ce format, Matomo sérialise parfois `nb_visits` en **string**, et sommer sans conversion
  produisait une concaténation (`0 + "234"` → `"0234"`). La sérialisation n'est pas systématique
  (l'instance renvoie des nombres sur bien des réponses), d'où une conversion défensive plutôt
  qu'un pari sur le format observé.

### Option A bis — Sommer les buckets bruts, sans découpage (essayée, corrigée avant merge)

Première version de cette PR. Matomo ne rogne pas ses périodes : sur
`period=week&date=2026-03-12,2026-06-10` il renvoie les semaines **pleines** qui recouvrent la
plage, à commencer par `2026-03-09,2026-03-15` — vérifié sur l'instance. Les conséquences sur
une fenêtre glissante (`aujourd'hui − N jours`, jamais alignée sur un lundi ou un 1er du mois) :

- le total inclut jusqu'à 7 jours hors période en granularité semaine, un mois en granularité
  mois ;
- la semaine frontière appartient à la **période courante et à la précédente**, donc la variation
  affichée est fausse (croissance sous-estimée) ;
- « simulations » ne couvrait plus la même fenêtre que « visiteurs uniques », les comptes BDD et
  les ventilations restés en bornes exactes : le taux de transformation, qui rapporte les deux,
  devenait faux.

Corrigé par `decouperPeriodeMatomo` : buckets entiers au centre, bords comblés à la granularité
inférieure (mois → semaines → jours). Coût : jusqu'à 4 requêtes par fenêtre au lieu d'une, toutes
en parallèle, contre 365 archives journalières si l'on revenait à `period=day`.

### Option B — Même traitement (approximation additive) pour les visiteurs uniques

- Avantages : uniformise le traitement, gain de performance sans dépendance externe.
- Inconvénients : un visiteur revenant sur plusieurs jours serait compté plusieurs fois, le
  dédoublonnage Matomo ne valant qu'à l'intérieur d'une requête. Change le sens du chiffre
  affiché. **Rejetée après retour explicite de l'utilisateur** : garder l'exactitude et résoudre
  la performance côté Matomo.

### Option C — Segments département pré-archivés côté Matomo (retenue pour les visiteurs uniques, non encore implémentée)

- Avantages : le cron `core:archive` traite les segments enregistrés avec l'option « process in
  the background », ce qui rend les requêtes correspondantes bien plus rapides sans perte de
  précision — cohérent avec l'UI Matomo, déjà rapide sur ces segments.
- Inconvénients : configuration côté administration Matomo (un segment par département, ~100),
  hors du code applicatif, et le gain dépend de ce que le cron a effectivement archivé — une
  plage arbitraire jamais calculée reste à calculer. À vérifier sur l'instance une fois en place.

### Option D — Cron applicatif de pré-chauffe (écartée pour l'instant)

- Avantages : reste dans le code de l'appli (même pattern que le cron de sync parcours), pas
  besoin d'accès admin Matomo.
- Inconvénients : réinvente ce que Matomo sait faire nativement (Option C) ; devrait couvrir
  combinatoirement période × département pour être efficace.

### Option D bis — Cache négatif sur échec (envisagée, écartée)

- Avantages : éviterait de rattendre le timeout de 10 s à chaque requête suivante.
- Inconvénients : **casse le contournement utilisateur observé en production**. Un timeout côté
  appli n'arrête pas Matomo, qui continue de calculer l'archive en tâche de fond ; un nouvel
  essai quelques minutes plus tard réussit alors souvent — c'est ce que fait l'utilisateur
  aujourd'hui. Mettre l'échec en cache aurait servi cet échec obsolète pendant toute la durée du
  cache. **Rejetée après retour explicite de l'utilisateur.**

## Conséquences

### Positives

- « Simulations éligibles / terminées » ne déclenche plus de calcul `range` segmenté, et le
  chiffre porte exactement sur la période demandée.
- Les bornes de fenêtre sont désormais calculées à un seul endroit (`periode-window.ts`), en
  jours calendaires locaux : une fenêtre « 7j » couvre 7 jours et non 8, et la période précédente
  ne partage plus sa journée frontière avec la courante. Les deux services Matomo dupliquaient ce
  calcul, chacun avec le même défaut.
- Une réponse Matomo incomplète (sous-période non tabulaire, compteur non numérique) fait
  désormais échouer l'appel, donc afficher « Indisponible », au lieu de produire un total amputé
  indiscernable d'une baisse réelle.
- Les échecs restent non mis en cache : un nouvel essai après timeout peut réussir dès que
  l'archive est prête.

### Négatives / Risques

- « Visiteurs uniques » reste potentiellement lent sur département + longue période tant que
  l'option C n'est pas en place côté administration Matomo — dépendance externe.
- Le **total du graphique de visites** (`/administration` → Acquisition) garde des buckets de
  bord qui débordent de la fenêtre : il dépasse légèrement la période demandée. Assumé pour une
  courbe de tendance, où le total doit rester égal à la somme des points affichés ; à reprendre si
  ce chiffre doit être comparé aux autres KPI.
- Le découpage émet jusqu'à 4 requêtes par fenêtre au lieu d'une (parallélisées).
- La correction des bornes décale d'un jour toutes les fenêtres du dashboard, KPI BDD compris :
  les séries d'avant et d'après ne sont pas strictement comparables.

### Migration (si applicable)

Pour rendre « visiteurs uniques » rapide sans changer sa sémantique (option C, suivi) : dans
l'administration Matomo, déclarer un segment par département (`dimensionX==code`) avec l'option
« Traiter ce rapport en tâche de fond également » activée. Action côté ops/admin Matomo, hors du
code applicatif, à mesurer une fois faite.

## Liens

- `src/features/backoffice/administration/acquisition/domain/decoupage-periode.ts` —
  `decouperPeriodeMatomo` (alignement sur les bornes de bucket)
- `src/features/backoffice/administration/tableau-de-bord/domain/periode-window.ts` — bornes de
  fenêtre partagées (inclusives côté Matomo, exclusives côté BDD)
- `src/features/backoffice/administration/acquisition/adapters/matomo-api.adapter.ts` —
  `sumEventCounts`, `fetchMatomoApiCached` (cache des seuls succès, inchangé)
- `src/features/backoffice/administration/tableau-de-bord/services/tableau-de-bord.service.ts` —
  `getSimulationsMatomo` (découpage + cumul), `getUniqueVisitors` (inchangé, `period=range`)
- [Référence API Matomo](https://developer.matomo.org/api-reference/reporting-api) —
  normalisation des périodes ; [guide archivage](https://developer.matomo.org/guides/archiving)
