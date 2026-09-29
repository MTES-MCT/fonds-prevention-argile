# ADR-0041 : Calcul de vulnérabilité sans pondération en cascade, moyenne quadratique

**Date** : 2026-09-29
**Statut** : Accepté

## Contexte

Le score de vulnérabilité RGA (`/vulnerabilite-rga`) se calculait jusqu'ici en cascade à trois
niveaux (ADR-0030) : poids de catégorie (sol 30 / eaux 25 / végétation 25 / divers 20) × poids
de critère dans sa catégorie × barème 0-100 par réponse, puis moyenne pondérée renormalisée sur
les critères répondus.

Ce modèle pose un problème de fond, indépendant de la validation métier déjà identifiée comme
P0 (ADR-0030 §6) : les deux niveaux de poids (catégorie, critère) sont des arbitrages relatifs
— combien « la gestion de l'eau » compte-t-elle face à « la végétation » ? — sans méthode pour
les trancher autrement qu'au doigt mouillé. Le cumul des deux niveaux rendait la moindre
correction de poids difficile à justifier et le résultat difficile à expliquer à un utilisateur
(« pourquoi ce mauvais point sur les gouttières ne fait-il monter le score que de 3 points ? »).

Par ailleurs, une moyenne — pondérée ou non — dilue le risque quand quelques mauvaises réponses
sont noyées parmi beaucoup de bonnes : 2 critères au pire score sur 12 ne donnent que 17/100 en
moyenne simple, alors que la présence de deux sources de vulnérabilité réelles et simultanées
est, en pratique RGA, plus grave que ce chiffre ne le laisse penser (l'effet des cycles de
gonflement/retrait se cumule).

## Décision

> Le score de vulnérabilité ne conserve qu'un seul niveau de pondération — le barème par
> réponse (0 = idéal, 100 = risque maximal) — et l'agrège par **moyenne quadratique (RMS)**
> plutôt qu'arithmétique, sur 3 niveaux de vulnérabilité (`faible` / `moyen` / `fort`, seuils
> 34 et 67).

Les poids de catégorie et de critère sont retirés de `grille-ponderation.ts`. Chaque critère
répondu et applicable compte à égalité dans le calcul :

```
scoreGlobal = round( racine( moyenne( score² ) ) )   // sur les critères répondus/applicables
```

`CATEGORIES_CONFIG` (sol/eaux/végétation/divers) et son flag `actionnable` survivent comme
simple regroupement d'affichage — filtre des recommandations (le sol reste non actionnable,
jamais de fiche conseil) et cartes « score moyen par catégorie » de
`/administration/vulnerabilite`, recalculées en RMS non pondérée sur les seuls critères de la
catégorie, à titre purement informatif, sans effet sur le score global.

## Options envisagées

### Option A — Moyenne quadratique (RMS), sans pondération de catégorie/critère (retenue)

- Avantages : formule « pure », sans paramètre à calibrer soi-même ; amplifie mécaniquement le
  cumul de plusieurs sources de vulnérabilité (l'exemple ci-dessus passe de 17/100 à 41/100) ;
  un seul niveau de pondération (le barème) reste, cohérent avec la demande de ne garder « que
  la pondération pour chaque réponse ».
- Inconvénients : moins intuitive à expliquer qu'une moyenne (« pourquoi une racine carrée ? ») ;
  l'aléa du sol (`aleaRga`), qui pesait 30 % via le poids de catégorie, ne pèse plus qu'un
  critère parmi ~12 — décision assumée, cohérente avec « chaque critère répondu compte à
  égalité ».

### Option B — Moyenne arithmétique simple, sans pondération de catégorie/critère

- Avantages : la plus simple à expliquer et à calculer.
- Inconvénients : ne traduit pas le fait que cumuler plusieurs sources de vulnérabilité est
  plus problématique qu'une source isolée — deux mauvaises réponses noyées parmi dix bonnes
  restent classées « faible ». Écartée sur ce point précis.

### Option C — Moyenne simple + bonus par critère au-dessus d'un seuil de risque

- Avantages : plus intuitive à expliquer qu'une RMS (« +5 points par critère à risque »).
- Inconvénients : introduit deux paramètres arbitraires supplémentaires (seuil de
  déclenchement, montant du bonus) à calibrer sans méthode, à l'exact opposé de l'objectif de
  simplification. Écartée.

## Conséquences

### Positives

- Un seul fichier (`grille-ponderation.ts`) et un seul niveau de pondération à faire valider
  par un expert RGA (le barème par réponse), au lieu de trois niveaux imbriqués.
- Le cumul de plusieurs sources de vulnérabilité est désormais visible dans le score, sans
  configuration supplémentaire.
- Le tri des recommandations (`recommandations.service.ts`) se simplifie : sans `poidsGlobal`,
  il ne reste que le score de la réponse comme signal d'importance — `priorite = score`.

### Négatives / Risques

- L'aléa du sol (`aleaRga`), non actionnable, pèse désormais moins qu'avant (1 critère parmi
  ~12 au lieu de 30 % du score) — un logement en zone d'aléa fort mais par ailleurs irréprochable
  aura un score plus bas qu'avant. Décision assumée en réponse à l'utilisateur.
- La moyenne quadratique est moins immédiatement intuitive qu'une moyenne simple pour un lecteur
  du code non familier de la formule — documentée dans `scoring.service.ts` et
  `SIMULATEUR-VULNERABILITE-RGA.md` §3.
- Les seuils 34/67 sont un découpage en tiers égaux de l'échelle 0-100, pas une méthode validée
  par un expert RGA (même statut provisoire que le reste de la grille).

### Migration

- `grille-ponderation.ts` : suppression du champ `poids` sur `CategorieConfig` et
  `CritereConfig`.
- `scoring.service.ts` : `weightedAverage` remplacée par `quadraticMean` ; `NiveauVulnerabilite`
  passe de 4 valeurs (`faible`/`modere`/`eleve`/`tres_eleve`) à 3
  (`faible`/`moyen`/`fort`) ; `SEUILS_NIVEAU` recalculés (34/67 au lieu de 25/50/75).
- `recommandations.service.ts` : `RecommandationPrioritaire` perd `poidsGlobal` et `priorite`,
  tri direct par `score` décroissant.
- `niveau-badge.const.ts` : 3 entrées par table au lieu de 4 (labels et couleurs).
- Aucune migration DB : `scoreParCategorie` (jsonb) garde la même forme, seul le calcul en amont
  change.
- `grille-ponderation.test.ts` : suppression des tests « somme des poids = 100 », devenus sans
  objet.

## Liens

- Amende [ADR-0030](0030-simulateur-vulnerabilite-rga.md) (grille de pondération centralisée —
  le principe de centralisation reste valide, seul son contenu change).
- Documentation : [SIMULATEUR-VULNERABILITE-RGA.md §3](../vulnerabilite/SIMULATEUR-VULNERABILITE-RGA.md#3-architecture)
- Fichiers : `src/features/vulnerabilite-rga/domain/value-objects/grille-ponderation.ts`,
  `src/features/vulnerabilite-rga/domain/services/scoring.service.ts`,
  `src/features/vulnerabilite-rga/domain/services/recommandations.service.ts`,
  `src/features/vulnerabilite-rga/domain/value-objects/niveau-badge.const.ts`
