# Vulnérabilités Snyk — Acceptées

Date d'audit initial : mars 2026 (Snyk)
Dernier refresh : juin 2026 (`pnpm audit`, voir section dédiée)
Auditeur : Samir + Claude

## Décision

Après upgrade des dépendances (mars 2026), les vulnérabilités restantes sont **acceptées** :

- **Toutes sont des devDependencies ou transitives** sans path d'exploitation directe
- **Les vulnérabilités critiques ont été résolues** (fast-xml-parser via @types/nodemailer, axios via @getbrevo/brevo v4)
- **0 exploit mature** connu
- **Aucun fix disponible** sans upgrade majeur breaking (Next 16, ESLint 10)

## Vulnérabilités détaillées

| Dépendance                 | Sous-dep vulnérable                  | Sévérité    | Type    | Justification                             |
| -------------------------- | ------------------------------------ | ----------- | ------- | ----------------------------------------- |
| eslint@9.39.0              | minimatch@3.1.2, ajv@6.12.6, js-yaml | High/Medium | devDep  | Non déployé en prod                       |
| eslint-config-next@15.5.6  | minimatch@9.x                        | High        | devDep  | Non déployé en prod                       |
| ts-node@10.9.2             | diff@4.0.2                           | Medium      | devDep  | Non déployé en prod                       |
| drizzle-kit@0.31.9         | esbuild (via @esbuild-kit)           | Medium      | devDep  | Non déployé en prod                       |
| exceljs@4.4.0              | minimatch@5.1.6                      | High        | runtime | Pas d'input utilisateur sur glob patterns |
| @vitejs/plugin-react@5.1.4 | rollup@4.x                           | High        | devDep  | Non déployé en prod                       |
| next@15.5.10               | (direct)                             | High        | runtime | CWE-770 mitigé par les limites Scalingo   |

## Upgrades effectués (mars 2026)

- `@getbrevo/brevo` 3.0.1 → 4.0.1 (résout vuln axios high)
- `@sentry/nextjs` supprimé (non utilisé, résout vuln minimatch high)
- `@types/nodemailer` 7.0.3 → 7.0.11 (résout vuln fast-xml-parser critical)
- `@react-email/components` 0.5.7 → 1.0.8, `@react-email/render` 1.4.0 → 2.0.4
- `@types/exceljs` supprimé (deprecated)
- 19 packages patch/minor mis à jour

## Refresh dépendances — juin 2026

Refresh des branches Dependabot sur `chore/update-deps`. Audit via `pnpm audit`
(Snyk indisponible dans l'environnement). Vérification : `pnpm validate` + build prod verts.

### Upgrades embarqués

- Groupe sécurité (~19 deps patch/minor) : `react`/`react-dom` 19.2.4 → 19.2.7,
  `maplibre-gl` 5.19.0 → 5.24.0, `nodemailer` 8.0.5 → 8.0.10, `postgres` 3.4.8 → 3.4.9,
  `tailwindcss`/`@tailwindcss/postcss` 4.2.1 → 4.3.0, `postcss` 8.5.10 → 8.5.15,
  `vitest`/`@vitest/ui` 4.1.3 → 4.1.8, `drizzle-kit` 0.31.9 → 0.31.10,
  `@types/nodemailer` 7.0.11 → 8.0.0, `prettier`, `tsx`, `zustand`, `pmtiles`,
  `@react-email/*`, `dotenv`, `@types/pg`.
- `jsdom` 26.1.0 → 29.1.1 (devDep test).
- `@getbrevo/brevo` 4.0.1 → 5.0.4 (API `BrevoClient` inchangée).
- `typescript` 5.9.3 → 6.0.3 (retrait `baseUrl`, déclaration module CSS pour
  `noUncheckedSideEffectImports`).
- `zod` 3.25.20 → 4.4.3 (`error.errors` → `error.issues`, `FC_STATE_TTL` en `z.coerce.number`).

### Reportés (non propres)

- **Next 16** : reporté à une PR dédiée (`next lint` retiré → migration CLI ESLint).
- **ESLint 10** : casse `next lint` de Next 15 (options ESLint supprimées) — couplé à Next 16.
- **@vitejs/plugin-react 6** : incompatible avec la version de Vite tirée par Vitest 4.1.8
  (`ERR_PACKAGE_PATH_NOT_EXPORTED` sur `vite/internal`) — resté en 5.1.4.

### Vulnérabilités restantes (post-refresh, `pnpm audit`) — acceptées

Toutes transitives, sans path d'exploitation directe :

| Dépendance vulnérable     | Sévérité | Type    | Chemin                                      | Justification                                                                     |
| ------------------------- | -------- | ------- | ------------------------------------------- | --------------------------------------------------------------------------------- |
| `tmp` <0.2.6              | High     | runtime | `exceljs > tmp`                             | Path traversal via prefix/postfix non contrôlés par l'app                         |
| `protocol-buffers-schema` | Moderate | runtime | `maplibre-gl > … > protocol-buffers-schema` | Pas de schéma protobuf fourni par l'utilisateur                                   |
| `postcss` <8.5.10         | Moderate | build   | `@socialgouv/matomo-next > next > postcss`  | PostCSS bundlé par Next 15 ; notre `postcss` direct = 8.5.15 ; résolu par Next 16 |
| `uuid` <11.1.1            | Moderate | runtime | `exceljs > uuid`                            | exceljs ne passe pas de buffer utilisateur                                        |
| `diff` (jsdiff DoS)       | Low      | devDep  | `ts-node > diff`                            | Non déployé en prod                                                               |

## Prochaine revue

- **Lors de l'upgrade Next 16** (PR dédiée) : réévaluer next, eslint-config-next,
  ESLint 10 et le `postcss` bundlé par Next ; migrer le script `lint` vers le CLI ESLint.
- **Vérifier trimestriellement** les fix upstream pour `exceljs` (tmp, uuid) et `maplibre-gl`.
