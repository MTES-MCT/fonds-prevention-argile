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
- Commentaires de code : **1 ligne, jamais plus de 2**. Uniquement le _pourquoi_ non-évident, jamais la paraphrase du code. Le raisonnement détaillé (contexte, alternatives, décision) va dans le **message de commit** ou un **ADR**, pas dans le source.
  - Mauvais : bloc JSDoc de 6 lignes qui re-déroule la logique de la fonction.
  - Bon : `// Dérive du listing pour que le badge == « Tous les dossiers ».`

## Workflow

- Après implémentation, lancer `pnpm validate` (typecheck + lint + test)
- Préférer lancer un test ciblé (`pnpm test -- path/to/file.test.ts`) plutôt que toute la suite
- Lint avant commit : `pnpm format && pnpm lint`
- Produire du code, pas des plans (sauf si demandé explicitement)
- À chaque fin de fonctionnalité (groupe de commits / PR), **bumper la version** dans
  `package.json` selon SemVer : `feat` → minor (`1.17.0` → `1.18.0`), `fix`/`chore` →
  patch. Inclure le bump dans le même lot de commits que la feature.
- À chaque fin de fonctionnalité (groupe de commits / PR), **mettre à jour le `README.md`
  si nécessaire** (nouvelle commande, variable d'env, prérequis, changement d'usage
  visible). Si rien de pertinent ne change côté README, ne pas y toucher.

### Documentation à chaque PR / groupe de commits / fonctionnalité

- À chaque fonctionnalité (groupe de commits) ou PR, mettre à jour la doc impactée :
  `docs/ARCHITECTURE.md`, `docs/security/RBAC-ROLES.md`, `docs/parcours/FLOW-AND-SYNC.md`,
  `README.md`, et créer un ADR (`/adr`) si une décision structurante est prise.
  Pas de doc inutile : ne documenter que ce qui change réellement.
- Vérifier les vulnérabilités à chaque fonctionnalité (groupe de commits) : lancer
  `pnpm audit` (et `pnpm audit --prod` pour isoler le runtime). Toute vulnérabilité
  nouvelle ou acceptée doit être tracée dans `docs/security/snyk-accepted-vulnerabilities.md`
  avec sévérité, chemin transitif et justification d'acceptation (ou plan de correction).

### Tests E2E / UI à chaque PR

À chaque PR (ou groupe de commits livrant une fonctionnalité), proposer une
**checklist de tests manuels UI / E2E** que l'utilisateur déroulera pour valider la
branche. Règles :

- Format **collable dans Notion** : cases à cocher Markdown (`- [ ]`), une action par ligne.
- **Étape par étape, en quelques mots** : action → résultat attendu. Pas de paragraphes.
- **Couverture simple** : le chemin nominal + 1 à 2 cas limites qui touchent réellement au
  changement de la branche. Ne pas re-tester toute l'app, seulement la surface impactée.
- Grouper par flux / écran si plusieurs zones sont touchées.
- Lister en tête les **prérequis** (compte de test, environnement, seed) si nécessaires.
- Quand le changement corrige un bug remonté (QA), inclure le **scénario de repro exact**
  pour vérifier la non-régression.
- Français, accents. Pas d'emojis.
- Si la branche ne touche rien de visible côté UI, l'indiquer : « rien à tester côté UI ».

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
- **Ne jamais `git push`** (ni `push --force`, ni création de PR distante) : les push sont gérés exclusivement par l'utilisateur. Se limiter au commit local.

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
- `VisitsSummary.getVisits` en `period=day` sur un range long force Matomo à calculer une archive par jour (jusqu'à ~365 pour "12m"/"tout") : même cause que le timeout Funnels. `getMatomoStatistiques` (`matomo.service.ts`) adapte donc la granularité à la durée sélectionnée (`day` ≤30j, `week` pour 90j/6m, `month` pour 12m/tout) via `getGranulariteForPeriode` — ne pas revenir à `"day"` en dur sans réévaluer ce risque
- L'API Matomo répond **HTTP 200 même sur erreur d'authentification** (le verdict est dans le corps : `{"result":"error"}`) — ne jamais se fier au seul `response.ok`, et ne pas mettre ces réponses en cache HTTP

## Documentation contextuelle

Guides de référence détaillés, chargés en contexte via les références ci-dessous :

- @.claude/context/security-rules.md — Checklist sécurité (secrets, validation Zod, autorisation, SQL, logs)
- @docs/ARCHITECTURE.md — Vue d'ensemble (features, code partagé, routes, modèle de données)
- @docs/security/RBAC-ROLES.md — Rôles, permissions et espaces (FranceConnect/ProConnect)
- @docs/security/RBAC-TEST-PLAN.md — Plan de couverture RBAC (anti-fuite / anti-accès non désiré)
- @docs/parcours/FLOW-AND-SYNC.md — Flux et synchronisation du parcours
- @docs/security/snyk-accepted-vulnerabilities.md — Vulnérabilités acceptées (faux positifs)

Décisions d'architecture : voir `docs/adr/` (créer un ADR avec la skill `/adr`).
