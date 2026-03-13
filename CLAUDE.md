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

## Notes importantes

- Configuration email: Brevo (production) / Mailhog (dev)
- FranceConnect retourne un email non modifiable — le mail de contact est dans `emailContact` (champ séparé)

## Gotchas

- Les valeurs JSONB (`rgaSimulationData`) peuvent être des nombres au lieu de strings — toujours utiliser `asString()` de `@/shared/utils` pour lire les champs
- Les modales DSFR ne s'ouvrent pas avec l'attribut HTML `open` — utiliser `window.dsfr(modal).modal.disclose()`
- L'API Matomo Funnels timeout sur les périodes longues — limiter à 7 jours
