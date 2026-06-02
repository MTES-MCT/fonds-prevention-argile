# ADR-0002 : PostgreSQL + Drizzle ORM

**Date** : 2025-08-26
**Statut** : Accepté

## Contexte

L'application persiste des parcours, des dossiers Démarches Simplifiées, des utilisateurs/rôles, des données de simulation RGA (JSONB) et un historique de synchronisation. Il faut un stockage relationnel robuste et un accès typé depuis TypeScript, avec des migrations versionnées.

## Décision

Nous utilisons **PostgreSQL** comme base de données et **Drizzle ORM** (driver `postgres`, `drizzle-kit` pour les migrations) pour l'accès aux données.

> Nous utilisons Drizzle, un ORM SQL-first et fortement typé, sur PostgreSQL.

## Options envisagées

### Option A — PostgreSQL + Drizzle ORM (retenue)

- Avantages : Drizzle est SQL-first (requêtes proches du SQL, peu de magie), typage inféré depuis le schéma, support natif JSONB et migrations via `drizzle-kit`, léger et performant, schéma déclaré en TypeScript.
- Inconvénients : écosystème plus jeune que Prisma, pas d'équivalent à Prisma Studio aussi abouti (Drizzle Studio reste plus limité).

### Option B — PostgreSQL + Prisma

- Avantages : écosystème mature, Prisma Studio, migrations robustes.
- Inconvénients : couche d'abstraction plus épaisse, génération de client, gestion JSONB moins directe.

### Option C — PostgreSQL + requêtes SQL brutes / pg

- Avantages : contrôle total.
- Inconvénients : pas de typage, beaucoup de boilerplate, risque d'injection si mal fait.

## Conséquences

### Positives

- Schéma centralisé dans `src/shared/database/schema/`, repositories dans `src/shared/database/repositories/`.
- Typage de bout en bout.
- Convention projet : **toujours passer par le query builder Drizzle**, jamais de `db.execute()` avec SQL brut (voir `CLAUDE.md`).

### Négatives / Risques

- Les valeurs JSONB (`rgaSimulationData`) peuvent revenir en nombre au lieu de string — utiliser `asString()` (gotcha connu).
- Le SQL avancé (`unnest`, `DISTINCT ON`) se fait plutôt côté JS après lecture.

## Liens

- Drizzle ORM : https://orm.drizzle.team/
- Schémas : `src/shared/database/schema/`
- Repositories : `src/shared/database/repositories/`
- Migration : `src/shared/database/migrate.ts`
