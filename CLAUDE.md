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

## Notes importantes

- Le projet utilise TypeScript strict
- Respecter le DSFR pour les composants UI
- Les Server Actions sont dans les fichiers `*.actions.ts`
- Configuration email: Brevo (production) / Mailhog (dev)
