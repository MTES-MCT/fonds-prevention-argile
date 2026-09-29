# ADR-0041 : Ne jamais désigner une AMO parmi plusieurs à la place de quelqu'un

**Date** : 2026-09-29
**Statut** : Accepté

## Contexte

Quand le demandeur accepte d'être accompagné, quand l'Aller-vers qualifie un dossier ou quand le
super-admin rattache une AMO, l'application désignait l'AMO avec `findFirstAmoForTerritory` :
recherche par EPCI, puis `LIKE '%dd%'` sur le champ libre `entreprises_amo.departements`, **sans
`ORDER BY`**. Avec plusieurs AMO sur un même territoire, l'AMO sollicitée dépendait donc de l'ordre
physique des lignes : reproduit en local sur la CA de Cambrai (EPCI 200068500), où l'AMO a été
choisie sans que le demandeur voie la moindre liste, et tracée `manuel`.

Cinq fonctions calculaient la couverture d'une AMO, chacune à sa façon : la garde de sélection
(EPCI, commune ou département), la liste proposée (EPCI puis département, exclusifs), la garde
« l'Aller-vers vaut validation » (commune ou département, sans EPCI), le détail prospect (commune
et département fusionnés) et l'inventaire des départements non couverts (sous-chaîne). Le `LIKE`
faisait par ailleurs couvrir un département par une AMO dont le champ contenait le même nombre
ailleurs (code postal, autre département).

Décision métier (29/09/2026) : quand plusieurs AMO couvrent le territoire, **le demandeur choisit**.
L'Aller-vers choisit pour lui au moment de qualifier ; le super-admin ne rattache pas.

## Décision

> La couverture d'une AMO se calcule en un seul point (`couverture-amo.ts` +
> `amo-couverture.service.ts`) : **commune, puis EPCI, puis département**, niveaux exclusifs, le
> département étant lu en codes par `parseCodesDepartement`. Les AMO retenues sont triées par nom
> puis par id. Une attribution sans choix explicite n'aboutit que s'il n'y a **qu'une** AMO : au-delà,
> elle échoue avec `ERREUR_CHOIX_AMO_REQUIS` et c'est l'écran qui fait choisir.

Toutes les surfaces lisent cette source : liste proposée au demandeur et à l'Aller-vers, garde de
`selectAmoForUser`, attribution (`assignAmoAutomatiqueForUser`, `demanderAccompagnementDemandeur`),
garde « qualification vaut validation AMO », rattachement, acteurs locaux, départements non couverts.

Le mode d'attribution distingue désormais qui a désigné l'AMO (migration `0050`) :

| Mode               | Quand                                                                              |
| ------------------ | ---------------------------------------------------------------------------------- |
| `manuel`           | Le demandeur a choisi parmi plusieurs AMO                                          |
| `choix_agent`      | L'Aller-vers a choisi parmi plusieurs AMO en qualifiant                            |
| `auto_unique`      | Seule AMO du territoire, là où l'AMO est facultative                               |
| `auto_obligatoire` | Seule AMO du territoire, là où elle est imposée (inchangé)                         |
| `auto_av_amo`      | Seule AMO, département où l'aller-vers la cumule, ou validation directe (inchangé) |

## Options envisagées

### Option A — Couverture unique, aucune désignation parmi plusieurs (retenue)

- Avantages : l'AMO sollicitée est toujours celle que quelqu'un a désignée ; une seule règle pour
  proposer, contrôler et attribuer, donc aucune AMO proposée ne peut être refusée à la sélection.
- Inconvénients : un écran de plus pour le demandeur sur les territoires concernés ; toute
  ambiguïté de données (voir Risques) devient visible au lieu d'être tranchée en silence.

### Option B — Garder l'attribution automatique avec un ordre déterministe

- Avantages : aucun changement d'écran, une ligne de SQL (`ORDER BY nom`).
- Inconvénients : l'AMO reste imposée au demandeur, par l'ordre alphabétique ; contraire à la
  décision métier.

### Option C — Répartir entre les AMO (tourniquet, charge)

- Avantages : équilibre la charge des structures.
- Inconvénients : le demandeur ne choisit toujours pas ; exige un état partagé et une règle de
  répartition que personne n'a demandée.

## Conséquences

### Positives

- Plus aucune AMO sollicitée au hasard ; l'audit (`attribution_mode`) dit qui l'a désignée.
- La liste proposée et la garde de sélection ne peuvent plus diverger.
- Un `54000` ou un département voisin ne font plus couvrir un département par erreur.
- `getAmosDisponibles` résout USER-first avec repli agent, comme le reste de la résolution
  territoriale ; une erreur de lecture ne fait plus passer le demandeur en autonomie.

### Négatives / Risques

- **Le département reste un niveau de repli** : une AMO qui déclare « Nord 59 » en plus de ses EPCI
  couvre toutes les communes du Nord dont l'EPCI n'a pas d'AMO. Là où plusieurs AMO déclarent le
  même département, ces communes font désormais choisir, **y compris là où l'AMO est imposée**
  (le demandeur choisit laquelle, pas s'il en a une). `pnpm qa:cas-de-test --multi-amo` liste ces
  territoires : à lancer sur la production avant de livrer.
- Le niveau exclusif change la garde « qualification vaut validation AMO » : une structure qui ne
  couvre un territoire que par son département ne valide plus pour elle-même là où une autre AMO
  en couvre l'EPCI ; la sollicitation normale s'applique.
- Le rattachement super-admin échoue sur un territoire à plusieurs AMO : le demandeur, déjà en
  `sans_amo`, n'a pas d'écran pour choisir. Cas rare (détachement à tort), laissé à un échange
  direct avec lui.

### Migration

- `0050_attribution_amo_mode_new_values.sql` ajoute `auto_unique` et `choix_agent` à l'enum
  `attribution_amo_mode` (non suivi par drizzle-kit, migration écrite à la main comme `0041`).
- Les validations existantes gardent leur mode : un `manuel` antérieur à cette décision peut
  désigner une AMO attribuée par défaut.

## Liens

- Couverture : `src/features/parcours/amo/domain/value-objects/couverture-amo.ts`,
  `src/features/parcours/amo/services/amo-couverture.service.ts`
- Attribution : `src/features/parcours/amo/services/amo-selection.service.ts`
- Écrans : `CalloutChoixAccompagnement`, `CalloutAmoEnAttente`, `DemanderAccompagnementModal`,
  `ChoixAmoListe` (`src/features/parcours/amo/components/steps/`), `QualificationForm`
  (`src/app/(backoffice)/espace-agent/prospects/[id]/components/qualification/`)
- Rattachement : `src/features/parcours/amo/services/rattachement-amo.service.ts`
- Documentation : [FLOW-AND-SYNC §2.3.6](../parcours/FLOW-AND-SYNC.md), ADR-0037, ADR-0038
