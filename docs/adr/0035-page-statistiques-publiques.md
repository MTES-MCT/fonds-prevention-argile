# ADR-0035 : Page de statistiques publiques — sources, cache et absence de faux zéro

**Date** : 2026-09-08
**Statut** : Accepté

> Numéro 0035 et non 0034 : ce dernier est pris par une branche en cours de merge.

## Contexte

Les standards beta.gouv attendent une page de statistiques publique. Elle affiche six chiffres
cumulés depuis le lancement (`SERVICE_START_DATE`) et quatre courbes d'évolution mensuelle, sous
`/stats`, liée depuis le pied de page.

Trois contraintes propres à ce projet la distinguent du tableau de bord `/administration` :

- **Elle est anonyme et non authentifiée** : aucune donnée nominative ne doit y transiter, et
  n'importe qui peut la marteler — le coût par visite doit être borné.
- **Elle mélange deux sources** : Matomo (visiteurs, simulations, qui ne sont pas en base) et la
  BDD (comptes, dossiers). Matomo tombe ou time out régulièrement (ADR-0033).
- **Elle n'a pas de segment dynamique** : Next la prérendrait donc au build, où ni la BDD ni
  Matomo ne répondent — ce qui a cassé la CI de la première version.

## Décision

> Les compteurs Matomo indisponibles valent **`null`, jamais 0**, et s'affichent
> « Indisponible » : sur une page cachée une heure, un faux zéro reste figé et se lit comme un
> vrai chiffre. Le cache est **applicatif** (`unstable_cache`, 1 h, tag `public-stats`) et la
> page est `force-dynamic`, plutôt qu'un ISR qui imposerait un prérendu au build. Les comptages
> **additifs** (events de simulation) sont demandés en **buckets mensuels alignés**
> (`decouperPeriodeMatomo`) puis sommés, conformément à l'ADR-0033 ; les **visiteurs uniques**,
> non additifs, restent en `period=range`. Les définitions des métriques sont **alignées sur le
> back-office** (mêmes events, mêmes tables) pour qu'un chiffre public ne contredise pas un
> chiffre interne.

## Options envisagées

### Option A — ISR (`export const revalidate = 3600`) (écartée)

Le réflexe pour une page publique peu changeante. Mais sans segment dynamique, Next prérend la
route au build : la CI est tombée sur `ECONNREFUSED` (`Export encountered an error on /stats`).
L'échappatoire utilisée par les pages RGA (`generateStaticParams: []`, cf. l'OOM du 21/06/2026)
n'existe que pour une route paramétrée. Second défaut, indépendant du build : l'ISR **fige aussi
les échecs**. Une régénération tombée pendant une panne Matomo sert « Indisponible » pendant une
heure, sans possibilité de retenter — exactement ce que l'ADR-0033 refuse pour le cache Matomo.

### Option B — `force-dynamic` + `unstable_cache` côté service (retenue)

Le rendu reste dynamique, le coût est porté par un cache applicatif d'une heure, tagué
`public-stats`. `unstable_cache` **ne mémorise pas les rejets** : un timeout Matomo est retenté
au hit suivant au lieu d'être gelé, et l'archivage que Matomo termine en tâche de fond finit par
être lu. C'est déjà le mécanisme de `fetchMatomoApiCached` — la page ne fait qu'ajouter une
couche pour les comptages BDD.

### Option C — Compteurs recalculés à chaque visite (écartée)

Simple, mais la page est publique : les séries d'évolution lisent toutes les lignes de
`parcours_prevention` et de `dossiers_demarches_simplifiees`, et chaque visite déclencherait
plusieurs appels Matomo. Une page publique ne doit pas offrir ce levier.

### Option D — Recalculer les simulations depuis la BDD plutôt que depuis Matomo (écartée)

Le tableau de bord sait compter les simulations en base (`countSimulationsParEligibilite`, via
`EligibilityService`), ce qui éviterait toute dépendance Matomo. Écarté parce que la BDD ne
connaît que les simulations **d'un compte créé** : les simulations anonymes, majoritaires, n'y
sont pas. Le chiffre public serait très inférieur au chiffre interne, sans que la différence soit
explicable au lecteur.

## Conséquences

- Une panne Matomo dégrade la page (« Indisponible » sur trois cartes et une courbe) sans jamais
  l'empêcher de s'afficher : les compteurs BDD restent justes.
- `fetchMatomoUniqueVisitors` lève désormais quand `nb_uniq_visitors` est absent de la réponse au
  lieu de renvoyer 0. Matomo ne calcule pas toujours les visiteurs uniques sur un `range`
  (`enable_processing_unique_visitors_range`) : sans cette garde, l'absence de métrique se serait
  affichée comme « 0 visiteur », côté public **comme côté back-office**.
- `cumulerCompteurs` quitte `tableau-de-bord.service.ts` pour
  `acquisition/domain/cumul-compteurs.ts`, partagé par les deux surfaces.
- La carte « Dossiers d'éligibilité déposés » et la courbe du même nom partagent la même
  définition (`step = eligibilite` et `submitted_at` non nul). Rappel d'ADR-0027 :
  `dossiers_demarches_simplifiees` est un **pointeur courant**, pas un historique — une
  réinitialisation DN peut donc faire reculer ce compteur.
- `/stats` étant `force-dynamic`, un pic de trafic tape le cache applicatif, pas la BDD ; le
  premier hit après expiration paie le recalcul.

## Points ouverts

- « Diagnostics réalisés ou en cours » compte les parcours dont l'étape courante est
  `diagnostic`, `devis` ou `factures`, **archivés compris**. À trancher avec la DHUP avant
  publication : un dossier abandonné après son diagnostic reste comptabilisé.
