# ADR-0033 : Granularité adaptée pour les events Matomo du dashboard (anti-timeout)

**Date** : 2026-09-07 (amendé le 2026-09-08 et le 2026-11-16)
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

## Amendement du 2026-11-16 : rapports par dimension, cache et journal

Les lenteurs persistaient. Mesuré ce jour sur l'instance (`scripts/ops/debug/mesurer-matomo.ts`,
lecture seule), les rapports par dimension, restés en `period=range` avec `flat=1`, ne répondaient
plus dans le délai de 10 s :

| Requête                              | Avant                          | Après (sous-périodes, sans `flat`) |
| ------------------------------------ | ------------------------------ | ---------------------------------- |
| Par département, éligibles, 14 jours | 41,6 s (`range`, `flat`)       | 0,5 à 0,8 s                        |
| Par département, éligibles, 5 mois   | plus de 60 s (`range`, `flat`) | 0,7 s sur 11 mois                  |
| Par commune, éligibles, 11 mois      | 34,5 s (sous-périodes, `flat`) | 0,7 s                              |

- **Les rapports par dimension suivent la décision des évènements** : `getTopDepartementsMatomo`,
  `getTopCommunesMatomo` et `getVulnerabiliteTopDepartements` découpent la fenêtre
  (`decouperPeriodeMatomo`) puis somment. Totaux par valeur identiques au `range` : 0 écart sur
  14 jours, par département (16 valeurs) et par commune (261), en jours comme en semaines.
- **`flat=1` est abandonné sur ces rapports.** Il faisait charger à Matomo une sous-table d'URL par
  valeur, que l'adaptateur refusionnait aussitôt. Sans lui, mêmes totaux par valeur (0 écart sur cinq
  comparaisons, jusqu'à 1 915 communes), réponse 4 à 30 fois plus petite. `showColumns=nb_visits`
  et une réduction à `label` et `nb_visits` avant mise en cache tiennent l'entrée sous les 2 Mo de
  Next ; toutes les valeurs sont donc demandées, communes comprises.
- **Cache de 24 h pour une plage close depuis deux jours**, 1 h sinon (`estPlageStable`). Le bucket
  central d'un découpage garde la même clé plusieurs jours : il n'est plus redemandé chaque heure.
  La marge de deux jours couvre le réarchivage de la veille par Matomo.
- **Deux demandes identiques en cours partagent un appel** : taux de rebond et visiteurs uniques
  lisaient chacun le même `VisitsSummary.get` en `range`.
- **Chaque appel réel écrit une ligne** `[matomo] appel methode=… period=… jours=… segment=…
simultanes=… duree=… issue=…`, sans valeur de segment. Un appel servi par le cache n'en écrit pas.

Non traité, mesuré le même jour : `VisitsSummary.get` en `range` (visiteurs uniques, taux de rebond)
met 13,5 s sur 30 jours au national et dépasse 40 s sur la période précédente, sur 12 mois ou avec
un segment département, tant que Matomo n'a pas fini l'archive. Un plafond d'appels simultanés a été
écarté faute de mesure : derrière le délai de 10 s par appel, il allongerait le pire cas au-delà des
30 s du routeur. Suivi dans [SUJETS-A-TRAITER](../SUJETS-A-TRAITER.md#statistiques).

## Amendement du 2026-11-16 (suite) : taux de rebond et pannes isolées

Le taux de rebond de l'onglet Site vitrine quitte `range`. Un taux ne s'additionne pas, mais ses deux
termes si : `VisitsSummary.get` est lu par sous-périodes avec `showColumns=nb_visits,bounce_count`,
puis le service divise les sommes et arrondit à l'entier, comme le `bounce_rate` de Matomo.

| Fenêtre                         | `range`      | Sous-périodes | Visites et rebonds   |
| ------------------------------- | ------------ | ------------- | -------------------- |
| 30 jours, national              | 19,8 s       | 0,4 s         | identiques           |
| 30 jours précédents, national   | 32,7 s       | 0,4 s         | identiques           |
| 90 jours, national              | 55,5 s       | 0,3 s         | identiques           |
| 12 mois, national               | plus de 60 s | 0,7 s         | `range` sans réponse |
| 12 mois, un département (trois) | non mesuré   | 0,3 à 0,9 s   | non comparés         |

`getMatomoStatistiques` perd son `catch` global, qui remettait cartes et courbe à 0 dès qu'un appel
échouait. Chaque lecture échoue seule (`logMatomoFailure`) : `visiteursUniques` et `tauxRebond` valent
`null`, affiché « Indisponible », et la courbe reste. Les visiteurs uniques, toujours en `range`,
passent par la variante stricte : une métrique absente n'est plus lue comme 0.

### Visiteurs uniques : l'appel va au bout, l'appelant n'attend pas

Relevé le même jour sur la page Acquisition en local : les visiteurs uniques échouaient après 10 s
dans deux actions serveur successives, pour la même requête, soit 20 s d'attente sur une trentaine.
L'échec n'étant pas gardé (option D bis), le second écran repartait de zéro.

`requestVisitsSummary` passe par `appelerAvecPatience` (`adapters/appel-patient.ts`) :

- l'appel à Matomo dispose de 60 s, au-delà desquelles Matomo coupe lui-même la connexion ;
- l'appelant n'attend que 4 s, comptées depuis le début de l'appel, puis affiche « Indisponible » ;
- qui redemande la même plage rejoint l'appel en cours, sans attendre une seconde fois ;
- le résultat est gardé en mémoire du processus, 24 h pour une plage close et 1 h sinon ; périmé, il
  reste servi pendant qu'un nouvel appel le remplace. Un échec n'est toujours pas gardé ;
- le résultat porte l'instant où Matomo l'a rendu, affiché dans l'infobulle des deux cartes de
  l'administration (« Chiffre calculé à 17:42. ») : un chiffre servi périmé ne se présente pas comme frais.

Ce résultat ne passe plus par `unstable_cache` : dans une action serveur, Next attend le recalcul d'une
entrée périmée avant de rendre la réponse (`pendingRevalidates`), si bien qu'un appel de 60 s aurait
bloqué la page au-delà des 30 s du routeur. L'état vit sur `globalThis`, pages et actions étant
compilées à part. Il est propre à chaque conteneur et perdu au redémarrage : le premier appel le refait.

Vérifié sur une plage de 52 jours : main rendue en 4 s, demandes suivantes en 0 ms, nombre reçu dès la
fin de l'appel (21,8 s) puis servi sans nouvel appel. Limite : la plage de `/stats`, depuis le lancement
(397 jours), a dépassé 60 s deux fois de suite ; la carte y reste « Indisponible » tant que Matomo n'a
pas fini son archive.

## Liens

- `src/features/backoffice/administration/acquisition/domain/decoupage-periode.ts` —
  `decouperPeriodeMatomo` (alignement sur les bornes de bucket)
- `src/features/backoffice/administration/tableau-de-bord/domain/periode-window.ts` — bornes de
  fenêtre partagées (inclusives côté Matomo, exclusives côté BDD)
- `src/features/backoffice/administration/acquisition/adapters/matomo-api.adapter.ts` —
  `sumEventCounts`, `sumDimensionCounts`, `fetchMatomoApi` (cache des seuls succès, appels partagés)
- `src/features/backoffice/administration/acquisition/domain/plage-matomo.ts` — `estPlageStable`
- `src/features/backoffice/administration/acquisition/domain/journal-appel-matomo.ts` — ligne de journal
- `src/features/backoffice/administration/tableau-de-bord/services/tableau-de-bord.service.ts` —
  `getSimulationsMatomo` (découpage + cumul), `getUniqueVisitors` (inchangé, `period=range`)
- [Référence API Matomo](https://developer.matomo.org/api-reference/reporting-api) —
  normalisation des périodes ; [guide archivage](https://developer.matomo.org/guides/archiving)
