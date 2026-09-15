# Vulnérabilités Snyk — Acceptées

Date d'audit initial : mars 2026 (Snyk)
Dernier refresh : septembre 2026 (`pnpm audit`, voir section dédiée)
Auditeur : Samir + Claude

> **Ce document est chronologique : seule la dernière section « Refresh » fait foi.** Les
> sections antérieures conservent l'historique des décisions à leur date et peuvent citer
> comme « acceptée » une vulnérabilité corrigée depuis. Les entrées périmées portent un
> encart le signalant.
>
> **État courant (septembre 2026) — une seule vulnérabilité acceptée** : `uuid` <11.1.1
> (Moderate, transitif via `exceljs`). Tout le reste est corrigé à la source. Voir
> [Refresh — septembre 2026](#refresh--septembre-2026-branche-chorebump-deps-securite-sept).

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

> **Périmé depuis le [refresh d'août 2026](#refresh--août-2026-branche-chorebump-deps-securite)** :
> `postcss`, `protocol-buffers-schema` et `diff` ne sont plus acceptés (overrides `postcss` /
> `protocol-buffers-schema`, retrait de `ts-node`). Seul `uuid` reste accepté.

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

## Refresh — juillet 2026 (branche `remove-crisp`)

Audit déclenché par le remplacement du widget Crisp (sans lien avec les CVE elles-mêmes).
`pnpm audit --prod` remontait 16 vulnérabilités (8 high / 8 moderate) sur `next@15.5.18`,
absentes du dernier refresh car apparues depuis (DoS Image Optimization, fuite d'endpoints
Server Functions, CVE libvips via `sharp`). Vérification post-fix : `pnpm validate` (typecheck

- lint + 1463 tests) + `pnpm audit --prod` vert sur les points corrigés.

### Corrigées à la source

- **`next` 15.5.18 → 15.5.22** (bump patch, sans breaking change) : corrige toutes les CVE
  `next` propres (`>=15.5.0 <15.5.21`) — DoS Image Optimization SVG, fuite d'endpoints Server
  Functions non authentifiés, et les CVE `next@15.5.10` précédemment acceptées (voir refresh
  mars 2026) — désormais obsolètes.
- **`sharp`** (override `pnpm-workspace.yaml`, transitif via `next` pour l'Image Optimization
  API) : `0.34.5 → ^0.35.0`. Corrige `CVE-2026-33327/33328/35590/35591` (libvips).
- **`brace-expansion`** (override déjà en place, transitif via `minimatch` → `exceljs>archiver`
  côté prod et `eslint` côté dev) : `^2.0.3 → ^2.1.2`. Corrige la DoS par expansion
  exponentielle (`GHSA-3jxr-9vmj-r5cp`).

### Nouvelles vulnérabilités acceptées

| Dépendance vulnérable          | Sévérité | Type    | Chemin                                        | Justification                                                                                                                                                                                                                                                                                                   |
| ------------------------------ | -------- | ------- | --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `postcss` <8.5.18 (2 CVE High) | High     | build   | `next > postcss` (bundlé)                     | Lecture de fichier arbitraire + path traversal via `sourceMappingURL` dans un commentaire CSS. PostCSS est bundlé par Next 15 (notre `postcss` direct est déjà en 8.5.15+) ; aucune CSS externe/attaquant n'est traitée par ce pipeline. Résolu par Next 16 (même famille que les CVE `postcss` déjà acceptées) |
| `brace-expansion` <=5.0.7      | High     | runtime | `exceljs > archiver > … > minimatch`          | DoS par expansion non bornée (OOM). Pas d'input utilisateur sur les patterns glob d'`exceljs` (déjà la justification retenue pour le `minimatch` de cette même chaîne). Fix disponible (`5.0.8`) mais bloqué par `minimumReleaseAge` (publié 2026-07-23) jusqu'au **2026-07-30**                                |
| `js-yaml` (2e CVE, High)       | High     | devDep  | `eslint > @eslint/eslintrc > js-yaml`         | DoS quadratique via chaînes de clés de merge YAML — même paquet/chemin que la Moderate déjà acceptée (refresh juillet PJ). Config ESLint du repo uniquement, non déployé en prod. Résolu par ESLint 10                                                                                                          |
| `launch-editor` (NTLMv2)       | Moderate | devDep  | `@vitejs/plugin-react > vite > launch-editor` | Divulgation de hash NTLMv2 via chemin UNC — spécifique à un poste de dev Windows ; le serveur Vite (dev/test) n'est jamais exposé. Non applicable à l'infra de déploiement (Scalingo Linux)                                                                                                                     |

> **Périmé depuis le [refresh d'août 2026](#refresh--août-2026-branche-chorebump-deps-securite)** :
> aucune ligne de ce tableau n'est encore acceptée. La justification « résolu par Next 16 »
> du `postcss` bundlé était **erronée** — un override pnpm suffit (voir le refresh d'août).
> `brace-expansion` (`^2.1.4`) et `js-yaml` (`^4.3.1`) sont également corrigés par override ;
> `launch-editor` a purement disparu de l'arbre, `vite@7.3.6` ne le tirant plus.

### Reste après ce fix (`pnpm audit --prod`)

3 moderate inchangées (`protocol-buffers-schema`, `postcss` XSS, `uuid`) + les 3 High
ci-dessus (postcss ×2, brace-expansion). `pnpm audit` complet (devDep incluses) ajoute
`vite` High/Moderate, `js-yaml` High/Moderate et `diff` Low, déjà couverts par les
justifications existantes.

## Refresh — juillet 2026 (branche `update-brevo`, rebasée sur `remove-crisp`)

`pnpm audit --prod` (déclenché par l'ajout d'un event Brevo, sans nouvelle dépendance)
révélait 6 High/Moderate sur `next@15.5.18` (DoS Server Actions, SSRF Server Actions,
SSRF rewrites), avec `brace-expansion`, `sharp` et `postcss` (arbitrary file read)
acceptés en transitif. **Ce refresh est superseded par celui de la branche
`remove-crisp` ci-dessus**, rebasée en amont : le bump `next` → 15.5.22 (au lieu du
15.5.21 initialement visé ici) corrige aussi le lot DoS/SSRF Server Actions identifié
par cette branche, et les overrides `sharp` (`^0.35.0`) et `brace-expansion` (`^2.1.2`)
couvrent déjà les deux CVE que cette branche listait comme acceptées — elles ne le
sont donc plus, voir tableau « Nouvelles vulnérabilités acceptées » ci-dessus. Restait
alors le `postcss` (arbitrary file read, bundlé par Next), accepté au motif qu'il
n'était « pas overridable sans upgrade Next 16 ».

> **Corrigé depuis** — [refresh d'août 2026](#refresh--août-2026-branche-chorebump-deps-securite) :
> ce motif était faux. `next` déclare `postcss` en dépendance normale (`8.4.31`), donc un
> override pnpm s'applique sans attendre Next 16. L'override `postcss: ^8.5.26` est en place
> et **`postcss` ne fait plus partie des vulnérabilités acceptées**, ni en prod ni en dev.

## Refresh — août 2026 (branche `chore/bump-deps-securite`)

Purge de l'arriéré : le groupe `security` de Dependabot ([#311](https://github.com/MTES-MCT/fonds-prevention-argile/pull/311),
17 packages patch/minor) plus les overrides transitifs dont l'échéance `minimumReleaseAge`
était écoulée. `pnpm audit` passe de **19 à 1** vulnérabilité (prod : **10 → 1**).
Vérification : `pnpm validate` (typecheck + lint + 1694 tests + talisman) et build prod verts.

### Corrigées à la source (overrides `pnpm-workspace.yaml`)

| Override                            | Avant     | Après     | CVE éliminées                                                                                     |
| ----------------------------------- | --------- | --------- | ------------------------------------------------------------------------------------------------- |
| `postcss` (nouveau)                 | —         | `^8.5.26` | 4 (dont 2 High) — **prod** : lecture de fichier arbitraire via `sourceMappingURL`, XSS `</style>` |
| `nanoid` (nouveau)                  | —         | `^3.3.18` | 2 High — **prod**, transitif via le `postcss` bundlé par next                                     |
| `protocol-buffers-schema` (nouveau) | —         | `^3.6.1`  | 1 Moderate — **prod**, transitif via `maplibre-gl`                                                |
| `brace-expansion`                   | `^2.1.2`  | `^2.1.4`  | 2 High — **prod**, transitif via `exceljs > archiver`                                             |
| `js-yaml`                           | `^4.1.1`  | `^4.3.1`  | 3 (dont 2 High) — devDep `eslint`                                                                 |
| `undici`                            | `^7.28.0` | `^7.29.0` | 5 — devDep `jsdom`                                                                                |
| `esbuild`                           | `^0.25.0` | `^0.28.2` | échéance `minimumReleaseAge` écoulée depuis le 2026-06-18                                         |
| `vite`                              | `^7.3.2`  | `^7.3.6`  | 2 (dont 1 High) — devDep, voir piège ci-dessous                                                   |

> **Piège pnpm — un override ne s'applique pas à une peer auto-installée.** `vite` restait
> bloqué à 7.3.2 malgré l'override : il n'est tiré que comme `peerDependency` de `vitest` et
> `@vitejs/plugin-react`, et `pnpm install --force` / `pnpm update -r --depth=Infinity` n'y
> changeaient rien. Le refresh de juin avait attribué ce blocage à `minimumReleaseAge` — c'était
> une fausse piste (7.3.6 date du 2026-06-25). Correctif : déclarer `vite` en **devDependency
> explicite** (`7.3.6`) en plus de l'override.

### Dépendances mortes retirées

`argon2` (aucun hash de mot de passe dans le code : pas de colonne `password`, pas de service)
et `ts-node` (tous les scripts passent par `tsx`). Retire un build natif au postinstall
(entrée `allowBuilds` supprimée) et la dernière CVE devDep (`diff`, Low, via `ts-node`).

### Reste accepté (`pnpm audit`, 1 vulnérabilité)

| Dépendance vulnérable | Sévérité | Type    | Chemin           | Justification                                                                                            |
| --------------------- | -------- | ------- | ---------------- | -------------------------------------------------------------------------------------------------------- |
| `uuid` <11.1.1        | Moderate | runtime | `exceljs > uuid` | Inchangé : exceljs appelle `uuidv4()` sans buffer → faille non atteignable ; override v11 = major risqué |

## Refresh — septembre 2026 (branche `feat/desactivation-agents`)

Branche sans ajout de dépendance. `pnpm audit --prod` remontait **2 High nouvelles** sur
`browserslist`, apparues depuis le refresh d'août. Vérification : `pnpm validate` vert.

### Corrigées à la source (override `pnpm-workspace.yaml`)

| Override                 | Avant | Après     | CVE éliminées                                                                                                                           |
| ------------------------ | ----- | --------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `browserslist` (nouveau) | —     | `^4.28.8` | 2 High — `GHSA-73wf-gq98-2v4g` (croissance mémoire non bornée, pas d'éviction de cache) et crash / prototype write sur query non fiable |

Chemin transitif : `next > styled-jsx > @babel/core > @babel/helper-compilation-targets >
browserslist` (et le même via `@socialgouv/matomo-next > next`). Le paquet ne tourne qu'au
**build** (résolution des cibles navigateurs par Babel), jamais en service de requêtes, et
aucune query browserslist ne provient d'une entrée utilisateur. Le correctif était néanmoins
un simple bump patch dans la même mineure (`4.28.8`, publié le 2026-08-08, hors fenêtre
`minimumReleaseAge`) : corrigé plutôt qu'accepté.

Le checksum de `pnpm-lock.yaml` dans `.talismanrc` a été mis à jour en conséquence.

### Reste accepté (`pnpm audit --prod`, 1 vulnérabilité)

| Dépendance vulnérable | Sévérité | Type    | Chemin           | Justification                                                                                            |
| --------------------- | -------- | ------- | ---------------- | -------------------------------------------------------------------------------------------------------- |
| `uuid` <11.1.1        | Moderate | runtime | `exceljs > uuid` | Inchangé : exceljs appelle `uuidv4()` sans buffer → faille non atteignable ; override v11 = major risqué |

## Refresh — septembre 2026 (branche `chore/bump-deps-securite-sept`)

Lot groupé de bumps hors majors conflictuels, déclenché par **trois CVE Critical** publiées le
2026-09-08 (deux RCE `next`, un XSS `maplibre-gl`). `pnpm audit` passe de **6 à 1** vulnérabilité
(prod : 4 → 1). Vérification : `pnpm validate` (typecheck + lint + 2113 tests + talisman),
`pnpm build` prod, et **test manuel de la carte** (cf. maplibre ci-dessous).

> **Piège de méthode.** Un premier audit lancé le 2026-09-14 ne voyait que 3 vulnérabilités prod :
> la base d'advisories de `pnpm audit` n'avait pas encore indexé les deux CVE `next` du 08/09,
> pourtant vieilles de six jours. Relancer l'audit à quelques heures d'intervalle peut changer
> le verdict — ne pas conclure « rien de neuf » sur un seul passage.

### Corrigées à la source (bumps directs)

| Paquet             | Avant     | Après     | CVE éliminées                                                   |
| ------------------ | --------- | --------- | --------------------------------------------------------------- |
| `next`             | `15.5.23` | `15.5.24` | **2 Critical** (RCE non authentifiées) — contenu de la PR #344  |
| `maplibre-gl`      | `5.24.0`  | `6.4.1`   | **1 Critical** — XSS, CVSS 3.1 **10.0** (`GHSA-jrc7-96c5-q579`) |
| `postcss` (direct) | `8.5.26`  | `8.5.28`  | aligne la dep directe sur l'override                            |

Les deux CVE `next`, toutes deux **RCE non authentifiées**, patchées en 15.5.24 :

- **`GHSA-2xp9-vwfh-vxw4`** (CVSS **9.5**) — RCE dans l'**Image Optimization API** quand des
  fichiers AVIF sont utilisés. Applicable : `next/image` est utilisé sur 21 fichiers et l'app
  sert `/_next/image` en production.
- **`GHSA-p293-qw3h-jr36`** — RCE sur les serveurs **hébergés sous Windows**. Non applicable à
  notre runtime (buildpack Node Scalingo, base Ubuntu), corrigée par le même bump.

### maplibre-gl 6 : deux breaking changes, dont un invisible des tests

Le correctif du XSS (`DOM.sanitize()`, CWE-79, CVSS 10.0) n'existe **qu'en 6.x** — aucun backport
5.x. Le major impose deux adaptations.

**1. Plus d'export par défaut.** `import maplibregl from "maplibre-gl"` échoue en `TS1192`. Les
trois consommateurs (`useRgaMap`, `useRgaMapMarker`, `useRgaBuildingSelection`) passent en import
de namespace (`import * as maplibregl`), qui couvre l'usage valeur **et** type. Le reste de l'API
utilisée est inchangé : `Map`, `Marker`, `NavigationControl`, `addProtocol`/`removeProtocol`,
`setFeatureState`, types d'évènements, et l'intégration `pmtiles`.

**2. Le worker n'est plus bundlé — et c'est ce qui casse la carte sous Next.** La v6 est ESM-only
et charge son worker depuis un fichier voisin résolu via `import.meta.url`
(`new URL("./maplibre-gl-worker.mjs", import.meta.url)`). Sous webpack, `import.meta.url` pointe
le **chunk bundlé** dans `/_next/static/chunks/`, où ce fichier n'existe pas : Next répond sa page
404 en HTML et le navigateur rejette le module (« non-JavaScript MIME type "text/html" »). La
carte s'instancie — les contrôles +/− s'affichent — mais **aucune tuile n'arrive**.

> **Aucun garde-fou automatique n'attrape cette panne** : typecheck, 2113 tests et build prod
> passent tous au vert avec une carte morte. Seul un rendu réel la révèle. Toute évolution de
> maplibre doit être validée en ouvrant la carte, pas seulement avec `pnpm validate`.

Correctif en deux temps :

- `scripts/setup/copy-maplibre-worker.mjs` copie `maplibre-gl-worker.mjs` **et** son chunk
  `maplibre-gl-shared.mjs` (que le worker importe en relatif, les deux doivent être côte à côte)
  de `node_modules/maplibre-gl/dist/` vers `public/`. Branché sur **`postinstall`**, pas sur
  `prebuild` : `next dev` ne déclenche pas `prebuild`, la carte casserait en local. Node pur et
  sans dépendance, pour tourner aussi côté Scalingo où les devDeps sont élaguées. Les deux
  fichiers sont **gitignorés** : générés, jamais commités, donc jamais désynchronisés de la
  version installée.
- `useRgaMap` appelle `maplibregl.setWorkerUrl("/maplibre-gl-worker.mjs")` avant la création de
  la carte.

> Le `Procfile` n'est **pas** le bon crochet : ses entrées (`postdeploy`, `web`) tournent au
> runtime, après le build et après l'élagage des devDeps.

**Validation manuelle effectuée** (simulateur, étape « Où se situe votre logement ? ») : tuiles de
base et couche d'aléa rendues, points RNB chargés, marqueur d'adresse posé, overlay « Chargement
de la carte… » levé, clic sur un bâtiment → sélection, aléa et données BDNB (année de
construction, niveaux) remontées. Zéro ressource en échec. Worker et chunk partagé servis en 200
`application/javascript`, en dev **et** sur un `next start` de build de production.

### Corrigées à la source (overrides `pnpm-workspace.yaml`)

| Override                  | Avant     | Après     | CVE éliminées                                                                      |
| ------------------------- | --------- | --------- | ---------------------------------------------------------------------------------- |
| `sharp`                   | `^0.35.0` | `^0.35.4` | 1 High — **prod**, libheif (`GHSA-g89c-p67h-r497`, `GHSA-2jg2-4ch7-h545`) via next |
| `js-yaml`                 | `^4.3.1`  | `^4.3.2`  | 1 High — devDep `eslint`, `maxTotalMergeKeys` ne borne pas le CPU                  |
| `@humanfs/node` (nouveau) | —         | `^0.16.8` | 1 Moderate — devDep `eslint`, copie récursive suivant les symlinks                 |
| `postcss`                 | `^8.5.26` | `^8.5.28` | alignement sur la dep directe                                                      |

### Bumps de maintenance embarqués (groupe sécurité Dependabot #348)

`@types/pg` 8.21.0 → 8.23.1, `tsx` 4.23.12 → 4.23.13, `@testing-library/react` 16.3.2 → 16.3.3,
`@testing-library/user-event` 14.6.4 → 14.6.7, plus `vitest` **4.1.11 → 5.0.0** et `@vitest/ui`
4.1.11 → 5.0.0 (les 2113 tests passent sans modification ; `@vitest/ui` était resté en 4.1.10,
désaligné de `vitest` par la PR #342).

`allowBuilds` fixe désormais `"@gouvfr/dsfr": false` : pnpm réinjectait un placeholder invalide
(`set this to true or false`) dans `pnpm-workspace.yaml` à chaque install. `false` ne change rien
au comportement — le script d'install était déjà ignoré — mais supprime le bruit récurrent.

### Écarté

- **`nodemailer` 10.0.10** (PR #349) : publié le 2026-09-14, il viole `minimumReleaseAge`
  (1 semaine) et fait échouer la CI sur la policy supply-chain. À reprendre après le 2026-09-21.
  C'est la **seule** raison de l'exclusion, pas une incompatibilité.
- **Next 16 / ESLint 10 / `@vitejs/plugin-react` 6** (#263, #261, #234) : lot conflictuel
  toujours reporté à une PR dédiée.

> **Faux blocage à connaître.** Les CI rouges de `vitest@5.0.0` et `nodemailer@10.0.10` (14/09)
> affichaient toutes deux `ERR_PNPM_MINIMUM_RELEASE_AGE_VIOLATION`, pas une erreur de test :
> un échec de ce type se lève tout seul avec le temps. Vérifier l'âge de publication
> (`npm view <pkg> time --json`) avant de conclure à une incompatibilité — c'est ce qui a permis
> d'embarquer vitest 5 ici alors que sa PR Dependabot était rouge la veille.

### Reste accepté (`pnpm audit --prod`, 1 vulnérabilité)

| Dépendance vulnérable | Sévérité | Type    | Chemin           | Justification                                                                                            |
| --------------------- | -------- | ------- | ---------------- | -------------------------------------------------------------------------------------------------------- |
| `uuid` <11.1.1        | Moderate | runtime | `exceljs > uuid` | Inchangé : exceljs appelle `uuidv4()` sans buffer → faille non atteignable ; override v11 = major risqué |

## Prochaine revue

- **Lors de l'upgrade Next 16** (PR dédiée) : réévaluer next, eslint-config-next, ESLint 10,
  `@vitejs/plugin-react` 6 et `jsdom` 30 ; migrer le script `lint` vers le CLI ESLint. L'override
  `postcss` pourra probablement sauter (Next 16 embarque un postcss récent).
- **`@react-email/components`** : le package est marqué **deprecated** par l'upstream — prévoir
  une PR de migration ou de remplacement.
- **`brace-expansion`** : la ligne 5.x existe (`5.0.9`) mais reste un major ; `^2.1.4` embarque
  déjà les correctifs, pas d'urgence.
- **Vérifier trimestriellement** les fix upstream pour `exceljs` (tmp, uuid, brace-expansion) et `maplibre-gl`.
