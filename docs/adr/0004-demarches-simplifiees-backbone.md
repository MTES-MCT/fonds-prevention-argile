# ADR-0004 : Démarches Simplifiées comme socle des dossiers

**Date** : 2025-09-01
**Statut** : Accepté

## Contexte

Le parcours du fonds de prévention enchaîne plusieurs dépôts de pièces (éligibilité, diagnostic, devis, factures) qui doivent être instruits par des agents. Plutôt que de reconstruire un moteur de formulaires et d'instruction, l'État fournit **Démarches Simplifiées (DS)**, plateforme officielle de dématérialisation des démarches administratives.

## Décision

Nous utilisons **Démarches Simplifiées comme backbone des dossiers** : chaque étape instruite correspond à un dossier DS. L'intégration se fait via deux adapters distincts :

- **API GraphQL DS** pour lire le statut des dossiers (`getDossierStatus`).
- **API REST de préremplissage DS** pour créer/préremplir un dossier depuis nos données.

> Nous déléguons à Démarches Simplifiées la création, le dépôt et l'instruction des dossiers, et synchronisons leur statut dans notre base.

## Options envisagées

### Option A — Démarches Simplifiées (retenue)

- Avantages : plateforme officielle de l'État, instruction par les agents déjà outillée, pas de moteur de formulaires à maintenir, conformité administrative.
- Inconvénients : dépendance à un service externe (latence, disponibilité, pas de rate limit documenté), modèle d'état DS à mapper sur notre modèle interne, deux API hétérogènes (GraphQL lecture + REST préremplissage).

### Option B — Moteur de formulaires interne

- Avantages : contrôle total, modèle de données unique.
- Inconvénients : énorme coût de construction et de maintenance, réinvente l'instruction, pas d'intégration avec l'outillage agent existant.

## Conséquences

### Positives

- Le pattern adapter isole les API DS du domaine (`adapters/graphql/`, `adapters/rest/`).
- Mapping explicite DS → statut interne (`domain/value-objects/ds-status.ts`).

### Négatives / Risques

- Notre base doit être synchronisée avec DS (voir [ADR-0007](0007-modele-etat-parcours-sync-ds.md)).
- Sensible aux changements d'API DS et à sa disponibilité.

## Liens

- Démarches Simplifiées : https://www.demarches-simplifiees.fr/
- Adapter GraphQL : `src/features/parcours/dossiers-ds/adapters/graphql/client.ts`
- Adapter REST préremplissage : `src/features/parcours/dossiers-ds/adapters/rest/client.ts`
- Mapping statut : `src/features/parcours/dossiers-ds/domain/value-objects/ds-status.ts`
