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

### Corrigés via override (`pnpm-workspace.yaml`)

- `tmp` `^0.2.6` (résout la seule High : path traversal, transitif via `exceljs`).
  Bump patch sans risque, exceljs compatible. Élimine la seule vulnérabilité High du `pnpm audit`.

### Reportés (non propres)

- **Next 16** : reporté à une PR dédiée (`next lint` retiré → migration CLI ESLint).
- **ESLint 10** : casse `next lint` de Next 15 (options ESLint supprimées) — couplé à Next 16.
- **@vitejs/plugin-react 6** : incompatible avec la version de Vite tirée par Vitest 4.1.8
  (`ERR_PACKAGE_PATH_NOT_EXPORTED` sur `vite/internal`) — resté en 5.1.4.

### Vulnérabilités restantes (post-refresh, `pnpm audit`) — acceptées

Toutes transitives, sans path d'exploitation directe (0 High après l'override `tmp`) :

| Dépendance vulnérable     | Sévérité | Type    | Chemin                                      | Justification                                                                                 |
| ------------------------- | -------- | ------- | ------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `protocol-buffers-schema` | Moderate | runtime | `maplibre-gl > … > protocol-buffers-schema` | Pas de schéma protobuf fourni par l'utilisateur ; déjà sur le dernier maplibre                |
| `postcss` <8.5.10         | Moderate | build   | `@socialgouv/matomo-next > next > postcss`  | PostCSS bundlé par Next 15 ; notre `postcss` direct = 8.5.15 ; résolu par Next 16             |
| `uuid` <11.1.1            | Moderate | runtime | `exceljs > uuid`                            | exceljs appelle `uuidv4()` sans buffer → faille non atteignable ; override v11 = major risqué |
| `diff` (jsdiff DoS)       | Low      | devDep  | `ts-node > diff`                            | Non déployé en prod                                                                           |

## Refresh CVE — juin 2026 (branche `fix/cve`)

Branche dédiée aux CVE remontées par le scan conteneur + nouvelle dérive `pnpm audit`.
Vérification : `pnpm validate` (typecheck + lint + 1291 tests verts).

### CVE Alpine openssl/libssl3 — image **dev uniquement**, corrigées

`CVE-2026-45445`, `CVE-2026-42766`, `CVE-2026-42767` (openssl/libssl3 `3.5.6-r0`) sont des
paquets **apk Alpine**, pas npm. Elles proviennent de `FROM node:22-alpine` dans le
`Dockerfile`, qui ne sert qu'au **dev local** (`docker-compose.yml`, `CMD pnpm start:dev`).
La **prod** déploie via le **buildpack Node Scalingo** (base Ubuntu, `.buildpacks` + `Procfile`),
sans cette image Alpine : ces CVE ne touchent pas le runtime de production.

**Correctif** (`Dockerfile`) :

- bump `node:22-alpine` → `node:24-alpine` (aligne `engines.node=24.x`) ;
- `RUN apk upgrade --no-cache` pour garantir les paquets système (openssl) patchés
  (`libssl3`/`libcrypto3` `3.5.6-r0` → `3.5.7-r0`, vérifié sur l'image construite) ;
- copie de `pnpm-workspace.yaml` avant `pnpm install --frozen-lockfile` et alignement
  de pnpm `10.18.2` → `11.5.2` (les overrides vivent désormais dans `pnpm-workspace.yaml`,
  non copié auparavant → la build dev échouait en `ERR_PNPM_LOCKFILE_CONFIG_MISMATCH`).

### Dependabot embarqués

- `@gouvfr/dsfr-chart` 2.0.4 → 2.1.1 (PR #226). Le breaking change 2.1.0 (databox `title`→`name`)
  ne nous concerne pas : on n'utilise que `<line-chart>` avec `name=`.
- `@types/react` 19.2.14 → 19.2.17 (PR #226, types only).

### Reportés (inchangés, PR dédiée Next 16)

- **Next 16** (#213), **ESLint 10** (#211), **@vitejs/plugin-react 6** (#209) : voir refresh juin
  ci-dessus, toujours couplés à la migration Next 16.

### Nouvelle vuln High acceptée — `esbuild` (devtooling)

| Dépendance vulnérable | Sévérité | Type  | Chemin                                                        | Justification                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| --------------------- | -------- | ----- | ------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `esbuild` <0.28.1     | High     | build | `tsx > esbuild`, `drizzle-kit > esbuild` (override `^0.25.0`) | « Missing binary integrity verification in **Deno** » : non atteignable en Node ; esbuild ne tourne qu'au build/migration (`tsx migrate.ts`), pas en service de requêtes. Le pin vient de l'override explicite `esbuild: ^0.25.0` (`pnpm-workspace.yaml`). Bump vers `^0.28.1` **tenté** mais bloqué par `minimumReleaseAge` (1 semaine) : `esbuild@0.28.1` publié le 2026-06-11 → éligible à partir du **2026-06-18**. À ce moment, repasser l'override à `^0.28.1` et `pnpm install` (pas besoin d'exclusion). |

Les Moderate restantes (`protocol-buffers-schema`, `postcss`, `uuid`) sont inchangées (voir tableau
refresh juin ci-dessus).

## Refresh CVE — juin 2026 (branche `fix/cve-nodemailer-undici`)

Alerte Snyk (org MTES-MCT) sur 3 CVE. **Corrigées à la source** (pas d'acceptation).
Vérification : `pnpm typecheck` + `pnpm lint` + 1437 tests verts + build prod OK.

### nodemailer 8.0.10 → 9.0.1 (High SSRF — corrigée)

`GHSA-p6gq-j5cr-w38f` : l'option message-level `raw` contourne
`disableFileAccess`/`disableUrlAccess` (lecture fichier arbitraire + SSRF). Patchée en
`>=9.0.1`. **Non exploitable ici** (chemin nodemailer réservé au SMTP dev/Mailhog —
la prod passe par l'API HTTP Brevo ; aucun usage de `raw` ni d'`attachments`), mais
corrigée à la source car c'est une dep de prod. Bump majeur 8→9 sans impact :
l'API utilisée (`createTransport` + `sendMail` champs basiques) est stable, `@types/nodemailer`
8.0.0 reste compatible (typecheck vert).

### undici 7.27.0 → 7.28.0 (override — High/Moderate transitives, corrigées)

`GHSA-vmh5-mc38-953g` (TLS bypass SOCKS5), `GHSA-vxpw-j846-p89q` (DoS WebSocket),
CRLF injection et origin validation error. **devDependency uniquement** (transitif
`jsdom` → `vitest`/`@vitest/ui`, jamais déployé en prod). Corrigé via override
`undici: ^7.28.0` dans `pnpm-workspace.yaml` (patché `>=7.28.0`).

> Note : Snyk annonçait « No remediation available yet » pour les CVE undici, mais
> `pnpm audit` et l'upstream confirment le patch en 7.28.0 (publié 2026-06-15).

### Reste après ce fix (`pnpm audit`)

- **Prod** : 3 Moderate inchangées (`protocol-buffers-schema`, `postcss`, `uuid`) — déjà acceptées.
- **Dev** : `vite` High (`server.fs.deny` bypass, `<=7.3.4`) — override déjà `^7.3.2` mais
  bloqué à 7.3.2 par `minimumReleaseAge` ; à débloquer avec le refresh Next 16. Hors scope.

## Refresh — juillet 2026 (branche `feat/pj-dynamiques-parcours-demandeur`)

Branche UI sans ajout de dépendance. `pnpm audit` : **1 high, 5 moderate, 1 low**, toutes
transitives et déjà connues sauf deux dérives devDep, acceptées ci-dessous.

| Dépendance vulnérable | Sévérité | Type   | Chemin                                         | Justification                                                                                                                                     |
| --------------------- | -------- | ------ | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `js-yaml` <=4.1.1     | Moderate | devDep | `eslint > @eslint/eslintrc > js-yaml`          | DoS quadratique sur clés de merge ; n'entre que sur la config ESLint du repo (pas d'input externe), non déployé en prod. Résolu par ESLint 10     |
| `vite` <=7.3.4        | Moderate | devDep | `vitest > vite`, `@vitejs/plugin-react > vite` | Même paquet que la High déjà acceptée (`server.fs.deny` bypass) ; serveur de dev/test uniquement, jamais exposé. Débloqué avec le refresh Next 16 |

Les autres (`protocol-buffers-schema`, `postcss`, `uuid`, `diff`, `vite` High) sont
inchangées — voir les tableaux ci-dessus.

## Refresh — juillet 2026 (branche `update-brevo`)

`pnpm audit --prod` (déclenché par l'ajout d'un event Brevo, sans nouvelle dépendance)
révélait 6 High/Moderate sur `next` (DoS Server Actions, SSRF Server Actions, SSRF
rewrites) apparues depuis le dernier audit : `next` était toujours pinné en `15.5.18`
(`<15.5.21`, patché). **Corrigé à la source** : bump patch `next` 15.5.18 → 15.5.21
(même mineure, aucune API dépréciée touchée). Vérification : `pnpm typecheck` + `pnpm lint`
+ suite de tests verte + `pnpm audit --prod` repassé de 14 à 6 vulnérabilités.

### Restantes après le bump (acceptées)

| Dépendance vulnérable        | Sévérité | Type    | Chemin                        | Justification                                                                                                                                                          |
| ----------------------------- | -------- | ------- | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `brace-expansion` <2.1.2      | High     | runtime | `exceljs > archiver > … > minimatch > brace-expansion` | DoS regex sur motifs `{}` — glob interne à `archiver` lors de la génération de zip/xlsx, jamais construit depuis une entrée utilisateur (même famille que `minimatch`/`uuid` déjà acceptés sur `exceljs`) |
| `sharp` <0.35.0 (libvips)      | High     | runtime | `next > sharp` (optionalDep bundlée) | CVE-2026-33327/33328/35590/35591 — sert uniquement à l'optimisation `next/image` sur des images de notre propre bundle (pas d'upload libre exposé à cette pipeline) ; version pilotée par `next`, pas overridable sans risque de casser l'optimiseur d'image interne |
| PostCSS <=8.5.11 (arbitrary file read) | High | build | `next > postcss` (bundlée, interne au build) | Instance PostCSS interne à Next (notre propre `postcss` direct est déjà en 8.5.15, non vulnérable) ; exploitable seulement via un `sourceMappingURL` dans du CSS transformé — nos fichiers CSS sont internes (Tailwind), jamais fournis par un tiers |

Les Moderate déjà connues (`protocol-buffers-schema`, `postcss` XSS `<8.5.10`, `uuid`)
restent inchangées — voir tableaux ci-dessus.

## Prochaine revue

- **`vite`** : passer à `>=7.3.5` dès que `minimumReleaseAge` le permet (élimine la High devDep restante).
- **Lors de l'upgrade Next 16** (PR dédiée) : réévaluer next, eslint-config-next,
  ESLint 10 et le `postcss`/`sharp` bundlés par Next ; migrer le script `lint` vers le CLI ESLint.
- **`esbuild`** : à partir du **2026-06-18** (fin du `minimumReleaseAge`), passer l'override
  `esbuild: ^0.25.0` → `^0.28.1` dans `pnpm-workspace.yaml` puis `pnpm install` — élimine la
  seule High runtime restante.
- **Vérifier trimestriellement** les fix upstream pour `exceljs` (tmp, uuid, brace-expansion) et `maplibre-gl`.
