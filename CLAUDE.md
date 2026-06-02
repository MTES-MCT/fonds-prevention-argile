# CLAUDE.md

Guide pour Claude Code sur le projet Fonds Prévention Argile.

## Projet

Application Next.js pour la gestion du fonds de prévention des risques liés au retrait-gonflement des argiles (RGA). Projet Beta.gouv.

## Commandes principales

```bash
pnpm start:dev      # Démarrer en développement
pnpm build          # Build production
pnpm test           # Lancer les tests
pnpm test:watch     # Tests en mode watch
pnpm lint           # ESLint
pnpm typecheck      # Vérification TypeScript
pnpm validate       # typecheck + lint + test
pnpm format         # Prettier
```

## Base de données

```bash
pnpm db:start       # Démarrer PostgreSQL (Docker)
pnpm db:push        # Appliquer le schema Drizzle
pnpm db:migrate     # Lancer les migrations
pnpm db:studio      # Drizzle Studio (GUI)
pnpm db:generate    # Générer les migrations
```

## Stack technique

- **Framework**: Next.js 15 (App Router)
- **UI**: DSFR (Design Système de l'État Français)
- **BDD**: PostgreSQL + Drizzle ORM
- **Tests**: Vitest + Testing Library
- **Style**: Tailwind CSS
- **Package manager**: pnpm

## Structure du code

```
src/
├── app/              # Routes Next.js (App Router)
├── features/         # Fonctionnalités métier
│   ├── auth/         # Authentification (FranceConnect)
│   ├── parcours/     # Parcours utilisateur
│   │   ├── amo/      # AMO (Assistant Maîtrise d'Ouvrage)
│   │   ├── core/     # Logique commune parcours
│   │   └── dossiers-ds/  # Intégration Démarches Simplifiées
│   └── seo/          # SEO et génération de données
└── shared/           # Code partagé
    ├── components/   # Composants réutilisables
    ├── database/     # Schema et repositories Drizzle
    ├── email/        # Templates et envoi d'emails
    └── types/        # Types TypeScript globaux
```

## Alias d'import

Utiliser `@/*` pour les imports depuis `src/`:

```typescript
import { ... } from "@/features/auth"
import { ... } from "@/shared/database/client"
```

## Architecture

Le projet suit une architecture orientée domaine (DDD-lite):

- `domain/entities/` - Entités métier
- `domain/types/` - Types du domaine
- `domain/value-objects/` - Objets valeurs
- `services/` - Logique métier
- `actions/` - Server Actions Next.js
- `adapters/` - Intégrations externes (APIs, etc.)

## Tests

- Fichiers de test: `*.test.ts` ou `*.test.tsx`
- Dans le même dossier que le fichier testé ou dans `__tests__/`
- Utiliser Vitest avec `describe`, `it`, `expect`

## Conventions de code

- TypeScript strict : typage explicite, jamais de `any` non casté
- Accents français obligatoires dans le texte user-facing (é, è, ê, à, ô, ç, î)
- Nommage fichiers : `*.actions.ts` (Server Actions), `*.service.ts`, `*.repository.ts`, `*.adapter.ts`
- Respecter le DSFR pour les composants UI
- Pas d'emojis dans le code ou les messages de sortie

## Workflow

- Après implémentation, lancer `pnpm validate` (typecheck + lint + test)
- Préférer lancer un test ciblé (`pnpm test -- path/to/file.test.ts`) plutôt que toute la suite
- Lint avant commit : `pnpm format && pnpm lint`
- Produire du code, pas des plans (sauf si demandé explicitement)

## Commits : simples et conventionnels

Suivre **Conventional Commits** : un titre court, une seule ligne de description.

Format :

```
<type>(<scope?>): <titre court à l'impératif>

<description en une seule ligne, le pourquoi plus que le quoi>
```

**Types courants** : `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `style`, `perf`, `build`, `ci`.

**Exemples** :

```
feat(parcours): ajoute l'étape AMO au parcours agent

Permet aux agents AV+AMO de saisir un dossier sans passer par FranceConnect.
```

```
fix(dossiers-ds): corrige la logique d'URL DS dans l'état du parcours

L'URL pointait vers la démarche au lieu du dossier, cassant la reprise de saisie.
```

```
docs(adr): justifie le choix de Drizzle ORM

Tradeoffs vs Prisma et raisons du choix pour la sérialisation JSONB.
```

Règles :

- Titre **sous 70 caractères**, à l'impératif, en minuscules.
- **Une seule ligne** de description (pas de listes à puces, pas de paragraphes).
- Préférer le **pourquoi** au quoi (le diff montre déjà le quoi).
- **Aucune mention d'auteur ou de co-auteur** dans le corps du commit (pas de `Co-Authored-By`, pas de `Generated with`, etc.). L'auteur git suffit.
- Committer uniquement à la demande explicite de l'utilisateur.

## Compaction du contexte

Lors de la compaction automatique ou manuelle (`/compact`), TOUJOURS préserver :

- La liste des fichiers modifiés dans la session
- Les commandes de test et vérification à relancer
- Les Gotchas rencontrés pendant la session
- Les décisions architecturales prises

## Notes importantes

- Configuration email: Brevo (production) / Mailhog (dev)
- FranceConnect retourne un email non modifiable — le mail de contact est dans `emailContact` (champ séparé)

## Requêtes base de données

- **Toujours utiliser le query builder Drizzle** (`db.select().from().where()`, `db.insert()`, `db.update()`, etc.) — ne jamais utiliser `db.execute()` avec du SQL brut
- Le query builder gère correctement la sérialisation des `Date`, arrays, et le nommage des tables/colonnes
- Pour les jointures : `innerJoin()`, `leftJoin()` avec `eq()` sur les clés
- Pour les filtres complexes : composer avec `and()`, `or()`, `gte()`, `lt()`, `inArray()`, `isNotNull()`, etc.
- Si une logique nécessite du SQL avancé (ex: `unnest`, `DISTINCT ON`), préférer récupérer les données via le query builder puis traiter côté JS
- Les repositories (`*.repository.ts`) encapsulent l'accès DB — les utiliser quand ils existent, sinon requêter directement dans les services

## Gotchas

- Les valeurs JSONB (`rgaSimulationData`) peuvent être des nombres au lieu de strings — toujours utiliser `asString()` de `@/shared/utils` pour lire les champs
- Les modales DSFR ne s'ouvrent pas avec l'attribut HTML `open` — utiliser `window.dsfr(modal).modal.disclose()`
- L'API Matomo Funnels timeout sur les périodes longues — limiter à 7 jours

## Documentation contextuelle

Guides de référence détaillés, chargés en contexte via les références ci-dessous :

- @.claude/context/security-rules.md — Checklist sécurité (secrets, validation Zod, autorisation, SQL, logs)
- @docs/parcours/FLOW-AND-SYNC.md — Flux et synchronisation du parcours
- @docs/security/snyk-accepted-vulnerabilities.md — Vulnérabilités acceptées (faux positifs)

Décisions d'architecture : voir `docs/adr/` (créer un ADR avec la skill `/adr`).
