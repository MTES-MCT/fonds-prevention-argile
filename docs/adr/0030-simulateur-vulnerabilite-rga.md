# ADR-0030 : Architecture du simulateur de vulnérabilité RGA

**Date** : 2026-09-04
**Statut** : Accepté

## Contexte

Un second simulateur public (`/vulnerabilite-rga`, embarquable via `/embed-vulnerabilite-rga`) est ajouté au produit
du Fonds Prévention Argile, indépendant du simulateur d'éligibilité existant (`/simulateur`). Son but n'est pas de
déterminer une éligibilité mais de sensibiliser le grand public au risque RGA (retrait-gonflement des argiles) via un
questionnaire vulgarisé, puis d'afficher un score de vulnérabilité (jauge) et des recommandations priorisées.

Quatre décisions structurantes ont dû être prises pour cadrer cette nouvelle feature.

## Décision

> `src/features/vulnerabilite-rga/` est une feature DDD-lite autonome, sans dépendance vers `src/features/simulateur/`
> (seulement vers les briques déjà génériques `shared/adapters/{ban,bdnb}`, `features/rga-map`, `/api/rga/alea`).
> La grille de pondération du score est centralisée dans un unique fichier. Le résultat s'appuie sur un SVG maison
> plutôt que sur `@gouvfr/dsfr-chart` `GaugeChart`. Les recommandations ne portent jamais sur l'aléa du sol (non
> actionnable) et sont toujours précédées d'un avertissement à consulter un expert RGA.

## Options envisagées

### 1. Indépendance vis-à-vis du simulateur d'éligibilité (retenue)

**Option A — feature autonome (retenue)**

- Avantages : `SimulateurLayout`/`NavigationButtons`/`useSimulateurStore` du simulateur d'éligibilité sont couplés à
  leur propre contexte (`SimulateurContext` : mode embarqué dans un wizard parent, mode édition agent, early-exit).
  Aucun de ces besoins n'existe ici. Des versions locales simplifiées (`VulnerabiliteLayout`, `NavigationButtons`,
  `vulnerabilite.store.ts`) restent petites (~40 lignes chacune) et ne risquent pas de régresser le simulateur
  existant. Les briques déjà génériques (adapters BAN/BDNB, `rga-map`, route `/api/rga/alea`) sont réutilisées telles
  quelles, sans aucune modification.
- Inconvénients : un peu de duplication structurelle (layout, navigation, pattern de store) entre les deux
  simulateurs.

**Option B — réutiliser `SimulateurContext`/`SimulateurLayout` en étendant leur API**

- Avantages : zéro duplication de layout/navigation.
- Inconvénients : aurait fallu complexifier `SimulateurContext` (déjà chargé : `embedded`, `editMode`,
  `customResultComponent`, `onBackBeyondFirstStep`) pour un cas d'usage sans rapport avec l'éligibilité, couplant deux
  domaines métier distincts et fragilisant le simulateur en production pour le bénéfice d'un nouveau venu.

### 2. Grille de pondération centralisée (retenue)

**Option A — un seul fichier `grille-ponderation.ts` (retenue)**

- Avantages : poids des catégories, poids des critères et barème par réponse vivent dans un seul fichier
  (`src/features/vulnerabilite-rga/domain/value-objects/grille-ponderation.ts`), avec un test de garde-fou
  (`grille-ponderation.test.ts`) qui vérifie que les sommes de poids tombent juste. `scoring.service.ts` ne contient
  aucun chiffre, seulement la logique de calcul. Un futur ajustement de méthode (validation par un expert RGA) ne
  touche qu'un fichier, jamais le code de calcul ni les composants d'étape.
- Inconvénients : les poids de départ (ex. sol 30 / eaux 25 / végétation 25 / divers 20, chaque critère noté 0-100)
  sont des hypothèses, pas une méthode validée par un expert métier — assumé et documenté en commentaire dans le
  fichier. La table d'agressivité par essence d'arbre (`ESSENCES_AGRESSIVITE`) est elle aussi provisoire, isolée dans
  un bloc séparé et clairement marquée comme à remplacer par la table définitive fournie par l'expert métier.

**Option B — barème codé en dur dans chaque composant d'étape**

- Avantages : aucun.
- Inconvénients : impossible à auditer, à faire valider par un expert, ou à ajuster sans relire chaque composant.

### 3. Jauge de résultat en SVG custom (retenue)

**Option A — SVG maison (retenue)**

- Avantages : `@gouvfr/dsfr-chart@2.1.1` est déjà une dépendance du projet et contient un `GaugeChart`
  (`node_modules/@gouvfr/dsfr-chart/dist/GaugeChart/`), mais `src/shared/hooks/useDsfrChart.ts` ne câble que
  `LineChart` (`GaugeChart` y est un simple commentaire `// TODO`) : ce composant n'a jamais été utilisé ni testé
  dans ce repo. Un SVG maison (`VulnerabiliteGauge.tsx` + `gauge.utils.ts` pur et testé) donne un contrôle total sur
  les couleurs DSFR, l'accessibilité (`role="img"` + `aria-label` textuel) et le rendu exact demandé (demi-cercle
  vert à gauche, rouge à droite, aiguille), sans dépendance non éprouvée.
- Inconvénients : ~80 lignes de SVG à maintenir, plutôt que de déléguer à une librairie.

**Option B — `@gouvfr/dsfr-chart` `GaugeChart`**

- Avantages : cohérence avec l'écosystème DSFR officiel si le composant s'avère fiable.
- Inconvénients : composant jamais éprouvé dans ce repo (chargement dynamique jamais implémenté), API et rendu exact
  inconnus sans expérimentation — risque de retard et de rendu final non maîtrisé pour une fonctionnalité visible.

### 4. Recommandations bornées à l'environnement proche, jamais sans avertissement (retenue)

**Option A — catalogue actionnable uniquement + callout systématique (retenue)**

- Avantages : `RECOMMANDATIONS_CATALOGUE` ne référence jamais un critère de la catégorie `sol` (non actionnable),
  garanti par un test dédié (`recommandations.catalogue.test.ts`). La priorisation (`poidsGlobal × score`) est
  strictement dérivée de la grille, sans règle spéciale cachée. `CalloutExpertRga` est toujours affiché avant la
  liste, quel que soit le score, pour ne jamais laisser croire que ce simulateur remplace un diagnostic d'expert.
- Inconvénients : aucun retour immédiat sur l'aléa du sol lui-même (accepté : ce n'est pas actionnable par le
  propriétaire, conforme à la demande produit).

**Option B — recommander aussi des actions sur le bâtiment/les fondations**

- Avantages : couverture plus complète des 3 sources de vulnérabilité.
- Inconvénients : hors périmètre demandé (travaux de fondation coûteux, nécessitent un diagnostic d'expert, pas un
  geste à suggérer dans un simulateur grand public vulgarisé).

## Conséquences

### Positives

- Aucune régression possible sur le simulateur d'éligibilité existant (zéro fichier partagé modifié en dehors de
  `shared/` et `rga-map`, déjà génériques).
- La méthode de scoring est auditable et ajustable en un seul endroit, avec un test qui empêche une incohérence de
  poids de passer inaperçue.
- La jauge et le calcul d'angle de l'aiguille sont testés unitairement sans dépendre du rendu SVG.

### Négatives / Risques

- Les poids de la grille et la table d'agressivité par essence ne sont **pas** validés par un expert RGA au moment du
  lancement — le score affiché est indicatif, ce que rappelle `CalloutExpertRga` sur l'écran de résultat.
- Duplication volontaire d'un petit layout/navigation avec le simulateur d'éligibilité (cf. option 1).

**Mitigation du risque ci-dessus** : `/vulnerabilite-rga` et `/embed-vulnerabilite-rga` sont déployées en production
mais volontairement **non indexées** (`export const metadata = { robots: "noindex, nofollow" }` sur les deux pages,
et les deux chemins ajoutés au `disallow` de `src/app/robots.ts`) tant que la grille n'est pas validée par un expert
RGA. Le double mécanisme couvre à la fois les moteurs de recherche classiques (respectent la balise meta `noindex`)
et la plupart des crawlers IA respectueux de `robots.txt` (aucune règle par bot spécifique — `GPTBot`/`CCBot`/etc. —
n'existe dans ce repo ; en l'absence de bloc dédié, ces bots suivent la règle générique `User-agent: *`, donc le
`disallow` générique les couvre déjà). Les deux pages ne sont pas non plus listées dans `src/app/sitemap.ts`. À
retirer (metadata + entrées `robots.ts`) une fois la méthode validée.

### Migration

Aucune : nouvelle feature, aucun code existant modifié. Retrait du `noindex`/`disallow` à prévoir une fois la grille
validée par un expert RGA (cf. « Mitigation » ci-dessus).

## Liens

- `src/features/vulnerabilite-rga/domain/value-objects/grille-ponderation.ts`
- `src/features/vulnerabilite-rga/domain/services/scoring.service.ts`
- `src/features/vulnerabilite-rga/domain/services/recommandations.service.ts`
- `src/features/vulnerabilite-rga/components/results/VulnerabiliteGauge.tsx`
- `src/shared/hooks/useDsfrChart.ts`
- `src/features/simulateur/components/shared/SimulateurContext.tsx`
