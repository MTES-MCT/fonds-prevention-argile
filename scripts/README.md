# Scripts

Outils utilitaires en CLI pour le projet `fonds-prevention-argile`. Organisés en 3 buckets clairs selon leur intention.

## Buckets

| Dossier | Rôle | Quand l'utiliser |
|---|---|---|
| [`seed/`](./seed/README.md) | Peupler la BDD avec des données de test (fixtures) | Bootstrap d'un environnement local ou staging from-scratch |
| [`ops/`](./ops/README.md) | Audit, correction, debug, nettoyage sur une BDD existante | Incident, maintenance ponctuelle, vérif d'intégrité |
| [`import/`](./import/README.md) | Imports depuis sources externes (PostGIS, APIs publiques) | Première mise en place d'une BDD ou refresh des données de référence |

Les scripts liés à une feature applicative (ex : génération SEO, import catnat) restent **dans la feature** (`src/features/<feature>/scripts/`).

## Règles de sécurité

- **Toujours vérifier `DATABASE_URL`** avant de lancer un script qui écrit en base. Un script destructif sur la prod = catastrophe.
- Les scripts de seed **refusent de tourner si `NEXT_PUBLIC_APP_ENV=production`** via un garde-fou triple (cf. [`seed/README.md`](./seed/README.md)).
- Les scripts `ops/` sont par défaut **read-only** sauf indication contraire dans leur en-tête. Ceux qui écrivent (ex : `fix-missing-epci.ts`) ont un mode `--dry-run`.
- Aucun script ne doit être lancé en CI sans flag explicite (`CI=true` + flag dédié).

## Tooling

Tous les scripts TypeScript se lancent via **`tsx`** (déjà installé) et respectent les `tsconfig.paths` (alias `@/`). Les scripts SQL se lancent soit via `psql -f`, soit appelés depuis un orchestrateur TypeScript.

## Commandes pnpm

| Commande | Script |
|---|---|
| `pnpm seed:staging` | Orchestrateur seed staging — pipeline complet, voir [`seed/README.md`](./seed/README.md) |
| `pnpm rga:import <shapefile>` | Import des zones RGA (PostGIS, voir [`import/rga-zones/README.md`](./import/rga-zones/README.md)) |
| `pnpm seo:import-catnat` | Import catastrophes naturelles (lié à la feature SEO, dans `src/features/seo/`) |
| `pnpm fix:epci` | Correction des EPCI manquants sur certains parcours (`ops/`) |
