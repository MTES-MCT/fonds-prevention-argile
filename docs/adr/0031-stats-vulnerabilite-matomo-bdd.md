# ADR-0031 : Statistiques d'usage du simulateur de vulnérabilité — hybride Matomo / BDD

**Date** : 2026-09-04
**Statut** : Accepté

## Contexte

Le simulateur de vulnérabilité RGA (`/vulnerabilite-rga`, cf. [ADR-0030](0030-simulateur-vulnerabilite-rga.md)) est
entièrement client-side (Zustand + `sessionStorage`) : aucune donnée n'est envoyée au serveur. Impossible de mesurer
son usage (nombre de simulations, répartition géographique, funnel de conversion) ni son impact (quelles réponses
sont données, quel score de vulnérabilité moyen en ressort) — donc impossible de faire évoluer la grille de
pondération (encore provisoire) avec de vraies données, ni de justifier l'investissement produit.

Le besoin : nombre de simulations au national, répartition par département, funnel de conversion par étape,
répartition en % de chaque réponse possible par question, score de vulnérabilité moyen — exposés dans un nouvel
onglet « Vulnérabilité » de `/administration`.

## Décision

> Les statistiques du simulateur de vulnérabilité combinent **Matomo** (volumétrie et comportement : total de
> simulations, répartition par département, funnel de conversion — même approche que le simulateur d'éligibilité)
> et une **nouvelle table Postgres strictement anonyme** `vulnerabilite_simulations` (répartition par réponse et
> score moyen — calculs que Matomo ne sait pas faire).

Le tracking Matomo réutilise la Custom Dimension département déjà en place
(`NEXT_PUBLIC_MATOMO_DIMENSION_DEPARTEMENT_ID`), isolée du simulateur d'éligibilité par un préfixe d'event dédié
(`vulnerabilite_*` vs `simulateur_*`) et un filtre `eventAction` sur chaque requête — aucune nouvelle dimension
Matomo à créer, aucun risque de mélange entre les deux simulateurs (vérifié dans le code de
`fetchMatomoSimulationsGroupedByDimension` avant d'écrire ce choix, cf. note ci-dessous).

## Options envisagées

### 1. Répartition géographique et funnel : Matomo (retenue) vs table BDD

**Option A — Matomo, en réutilisant la dimension département existante (retenue)**

- Avantages : cohérent avec l'approche déjà en place pour le simulateur d'éligibilité (mêmes patterns d'API, mêmes
  widgets réutilisables côté admin). Pas de nouvelle Custom Dimension à créer côté Matomo. Compte les visites même
  sans écriture BDD réussie (résilient à un échec réseau côté client). Le funnel de conversion est nativement une
  fonctionnalité Matomo (`Funnels.getFunnelFlowTable`) — le reconstruire depuis la table BDD demanderait de tracker
  chaque étape intermédiaire, ce que la table ne fait pas (elle n'enregistre que le résultat final).
- Inconvénients : dépend d'un funnel Matomo à créer manuellement côté admin Matomo (variable d'env
  `NEXT_PUBLIC_MATOMO_FUNNEL_ID_VULNERABILITE`, absente par défaut) — le widget affiche alors « non disponible »
  sans bloquer le reste de l'onglet.

**Option B — table BDD uniquement**

- Avantages : pas de dépendance à la configuration Matomo côté admin, une seule source de vérité.
- Inconvénients : ne compte que les simulations dont l'écriture best-effort a réussi (sous-estimation), ne capture
  aucune donnée d'abandon en cours de parcours (nécessaire au funnel) sans instrumenter chaque étape en BDD — ce qui
  aurait fait perdre l'anonymat strict recherché (identifiant de session nécessaire pour relier les étapes d'un même
  parcours).

**Vérification faite avant de trancher** : le risque de mélange entre les deux simulateurs dans les rapports Matomo
a été vérifié dans le code de l'adapter (`matomo-api.adapter.ts`) avant d'écrire cette décision, plutôt que supposé —
`fetchMatomoSimulationsGroupedByDimension`/`fetchMatomoCountByDimension` filtrent systématiquement par `eventAction`
(`combineSegments`), donc réutiliser la même dimension département avec des noms d'event distincts n'introduit
aucune fuite entre simulateurs.

### 2. Répartition par réponse et score moyen : table BDD anonyme (retenue) vs Matomo Custom Dimensions

**Option A — table Postgres anonyme (retenue)**

- Avantages : Matomo n'est pas fait pour calculer une moyenne numérique ni pour agréger des champs de formulaire
  multi-valeurs par question — il aurait fallu une Custom Dimension par critère (11 critères), avec les limites de
  volumétrie de Custom Dimensions Matomo. Une ligne par simulation terminée, sans FK vers `users`, sans adresse en
  clair, sans identifiant de session/visiteur/IP — seulement le code département et les réponses/scores.
- Inconvénients : écriture best-effort côté client (fire-and-forget, `enregistrerResultatVulnerabiliteAction`) : une
  simulation peut être comptée par Matomo mais pas par cette table si l'écriture échoue silencieusement. Assumé : le
  total de référence pour l'usage reste Matomo, cette table sert uniquement aux stats qu'elle seule peut produire.

**Option B — Matomo Custom Dimensions, une par critère**

- Avantages : une seule source de données pour toutes les stats.
- Inconvénients : pas de calcul de moyenne numérique côté API Matomo standard, complexité de configuration (11
  nouvelles dimensions), coût de maintenance largement supérieur à une table dédiée.

## Conséquences

### Positives

- Chaque source sert ce pour quoi elle est faite : Matomo pour le comportement/volumétrie, BDD pour l'agrégation
  numérique fine — pas de bricolage pour forcer l'une à faire le travail de l'autre.
- Minimisation des données assumée dans le schéma (`vulnerabilite_simulations`) : aucune donnée permettant de
  ré-identifier un répondant.

### Négatives / Risques

- Deux sources de vérité pour « le nombre de simulations » (Matomo = référence, table BDD = sous-ensemble
  best-effort) : à documenter clairement dans l'UI pour éviter toute confusion si les deux chiffres divergent.
- Le funnel de conversion dépend d'une action manuelle côté Matomo (création du funnel) hors du contrôle du code.

### Migration

- Nouvelle table `vulnerabilite_simulations` (migration Drizzle à générer par l'équipe applicative, la génération de
  migration nécessitant une connexion BDD non disponible dans l'environnement d'implémentation).
- Nouvelle variable d'env optionnelle `NEXT_PUBLIC_MATOMO_FUNNEL_ID_VULNERABILITE`, à renseigner une fois le funnel
  créé côté Matomo.

## Liens

- [ADR-0030](0030-simulateur-vulnerabilite-rga.md) — architecture du simulateur de vulnérabilité
- `src/features/backoffice/administration/vulnerabilite/` — service, actions et composants de l'onglet
- `src/shared/database/schema/vulnerabilite-simulations.ts` — schéma de la table anonyme
- `src/features/backoffice/administration/acquisition/adapters/matomo-api.adapter.ts` — `fetchMatomoCountByDimension`
