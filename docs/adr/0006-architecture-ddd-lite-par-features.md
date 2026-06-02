# ADR-0006 : Architecture DDD-lite organisée par features

**Date** : 2025-08-26
**Statut** : Accepté

## Contexte

L'application couvre plusieurs domaines métier (auth, parcours, simulateur, SEO, back-office) avec des intégrations externes hétérogènes (DS, FranceConnect/ProConnect, Brevo, Matomo). Une structure « par couche technique » (tous les services ensemble, tous les composants ensemble) disperse un même domaine sur tout le repo. Il faut une organisation qui garde la cohésion métier et isole les détails techniques.

## Décision

Nous organisons le code **par feature métier** sous `src/features/`, chaque feature suivant une structure **DDD-lite** :

- `domain/` — `entities/`, `value-objects/`, `types/` (cœur métier, sans dépendance technique)
- `services/` — logique métier et orchestration (`*.service.ts`)
- `actions/` — Server Actions Next.js, points d'entrée fins (`*.actions.ts`)
- `adapters/` — intégrations externes (`*.adapter.ts`, clients API)
- `mappers/`, `utils/` — transformation et helpers

Le code transverse vit dans `src/shared/` (database, email, components, types, config).

> Nous structurons par domaine métier avec une séparation domain / services / actions / adapters, plutôt que par couche technique.

## Options envisagées

### Option A — DDD-lite par feature (retenue)

- Avantages : cohésion métier (tout un domaine au même endroit), inversion de dépendances (domain ne dépend pas des adapters), Server Actions en thin controllers, testabilité des services, conventions de nommage explicites.
- Inconvénients : discipline requise pour respecter les frontières, un peu plus de fichiers, DDD « complet » non visé (pas d'agrégats/repositories stricts partout).

### Option B — Organisation par couche technique

- Avantages : familier, peu de réflexion sur le découpage.
- Inconvénients : un domaine éparpillé, couplage rampant, refactors transverses coûteux.

## Conséquences

### Positives

- Conventions de nommage stables (`*.service.ts`, `*.actions.ts`, `*.adapter.ts`, `*.repository.ts`).
- `dossiers-ds` sert de feature de référence pour la structure.

### Négatives / Risques

- DDD-lite : les repositories vivent dans `src/shared/database/` plutôt que dans chaque feature (choix pragmatique) — incohérence assumée avec un DDD strict.

## Liens

- Features : `src/features/`
- Code partagé : `src/shared/`
- Feature de référence : `src/features/parcours/dossiers-ds/`
- Conventions : `CLAUDE.md` (sections Architecture et Conventions de code)
