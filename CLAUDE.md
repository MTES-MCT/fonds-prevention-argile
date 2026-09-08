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
branche.

#### Structure : un bloc autonome par parcours

Chaque parcours testé est un bloc qu'on peut dérouler seul, sans lire les autres (pour se
les répartir à plusieurs) : titre + objectif, **données**, étapes, cas limites, remise à
zéro. La **non-régression** forme le dernier bloc, à part : elle ne se rattache à aucun
scénario métier.

```markdown
# Tests manuels — <titre de la fonctionnalité>

**Environnement** : local — `pnpm db:start`, `pnpm start:dev`, Mailhog sur http://localhost:8025

---

## Parcours 1 — <nom court du scénario>

**Objectif** : <ce qu'on cherche à prouver, une phrase>

**Données**

- Compte FranceConnect : login `<login>` / `123` — libre en base, à consommer
- Compte agent (ProConnect) : `<email>` / `<mot de passe>` — <rôle, structure, territoire>
- Dossier concerné : http://localhost:3000/espace-agent/dossiers/<id> — <libellé du cas>
- Adresse à saisir : <adresse complète, avec le département visé>

**Étapes**

- [ ] <action> → <résultat attendu>
- [ ] <action> → <résultat attendu>

**Cas limites**

- [ ] <action> → <résultat attendu>

**Remise à zéro** : `pnpm fix:purge-comptes-test-fc --email=<email> --apply`

---

## Parcours N — Non-régression

- [ ] <action> → <résultat attendu>
```

Règles d'écriture :

- **Collable dans Notion** : cases à cocher Markdown (`- [ ]`), une action par ligne.
- **Une action, un attendu** séparés par `→`, en quelques mots. Pas de paragraphes.
- **Pas d'étapes numérotées** (`Étape 1`, `Étape 2`) : l'ordre de la liste porte déjà la
  séquence, et Notion ne numérote pas des cases à cocher. On insère une étape sans tout
  renuméroter.
- **Liens complets et cliquables**, jamais un chemin nu (`/mon-compte`) : `http://localhost:3000/...`
  en local, `https://fonds-argile-staging.osc-fr1.scalingo.io/...` pour une checklist staging.
- **Couverture simple** : le chemin nominal + 1 à 2 cas limites qui touchent réellement au
  changement de la branche. Ne pas re-tester toute l'app, seulement la surface impactée.
- Quand le changement corrige un bug remonté (QA), inclure le **scénario de repro exact**.
- Français, accents. Pas d'emojis.
- Si la branche ne touche rien de visible côté UI, l'indiquer : « rien à tester côté UI ».

#### Le bloc « Données » : des cas réels, jamais des préconditions génériques

C'est le cœur du format. Une étape du type « ouvrir un prospect non qualifié de ton
territoire » coûte plus de temps à instancier qu'à dérouler : le bloc « Données » doit donner
le compte, le mot de passe, l'URL du dossier et l'adresse à saisir, pour que les étapes n'aient
plus rien à résoudre.

**Comptes FranceConnect (demandeur).** Les citoyens mockés de l'IdP FC « low » (staging et
local) sont listés dans
[base.csv](https://github.com/france-connect/sources/blob/main/docker/volumes/fcp-low/mocks/idp/databases/citizen/base.csv).

- **On saisit le `login`, pas l'email** — piège classique, le CSV expose les deux.
- Le mot de passe est **`123` pour tous** les comptes du CSV.
- Toujours **vérifier que le compte est libre en base** avant de le proposer :
  `pnpm fix:purge-comptes-test-fc --no-anonymize` (dry-run) liste ceux **déjà pris** ; prendre
  un login dont l'email n'y figure pas. Un scénario « nouveau compte » a besoin d'un compte neuf.
- Écarter les identités piégeuses : `moins_16_ans` / `moins_18_ans` (mineurs) et les emails
  présents sur deux lignes du CSV.
- Donner la **commande de purge** en pied de bloc : le compte se consomme au premier passage.

**Comptes agents (ProConnect bac à sable).** Voir « Se connecter en tant qu'agent en local »
dans le [README](README.md) pour le diagnostic des échecs. Mots de passe :

| Compte                                  | Mot de passe       |
| --------------------------------------- | ------------------ |
| `user@yopmail.com`                      | `user@yopmail.com` |
| `userNN@yopmail.com` (ex. `user14@...`) | `password123`      |

`pnpm qa:cas-de-test --comptes` dit quels comptes existent en base, ce qu'ils voient et
lesquels sont marqués « COMPTE INEXPLOITABLE » (à écarter).

**Dossiers concernés.** `pnpm qa:cas-de-test --agent=<email> --markdown` sort, par scénario,
les dossiers réels du périmètre du compte **avec leur URL complète** : coller ces liens dans
le bloc « Données », pas sous les étapes.

Qui lance `qa:cas-de-test` dépend de l'environnement visé :

- **tests en local** (cas courant) : Claude lance le script lui-même sur la base de dev et
  livre directement une checklist avec les liens dedans — rien à coller ;
- **tests sur staging** : Claude n'a pas cette base. L'utilisateur lance le script (one-off
  Scalingo, ou en local avec le `DATABASE_URL` de staging — il est en lecture seule) et colle
  la sortie ; Claude l'associe alors aux blocs « Données », en réécrivant les URLs sur le
  domaine de staging.

Les cas se consomment (un prospect qualifié n'est plus « à qualifier », un compte FC utilisé
existe désormais en base) : relancer les deux scripts à chaque session de test. Ajouter un
scénario dans `scripts/ops/qa/scenarios.ts` quand la PR introduit un flux dont la précondition
n'existe pas encore.

### Revue Copilot avant merge (à chaque PR)

Une fois la branche prête et validée (`pnpm validate` vert), **ne pas merger directement**.
Le cycle de revue est le suivant :

1. **Claude demande à l'utilisateur de créer la PR** (Claude ne push pas et ne crée pas la
   PR — cf. règle « Ne jamais `git push` »). Claude peut préparer un titre et un corps de PR.
2. **L'utilisateur crée la PR et attend le retour de Copilot** (revue automatique
   « Overview » + commentaires de Copilot sur la PR).
3. **L'utilisateur donne le go** à Claude une fois le retour Copilot disponible.
4. **Claude récupère les commentaires Copilot et filtre les périmés** (cf. « Détecter les
   retours périmés » ci-dessous) : on ne traite que les fils **encore vivants**
   (`isOutdated == false && isResolved == false`).
5. **Triage tiéré** (c'est ce qui remplace l'ancien « compte rendu avant toute
   modification »). Claude sort un **tableau de triage compact** des fils vivants
   (`fichier:ligne · verdict · action en 1 ligne`), puis :
   - **Bas-risque / dans le périmètre** (placeholder, garde manquante, typo, test
     manquant, bump, petite cohérence) → Claude **corrige directement en lot**, puis fait
     un **résumé APRÈS** (le même tableau, annoté « fait »). Pas d'attente.
   - **Architectural / élargit le périmètre / point contesté** (transaction, refactor
     transverse, changement de contrat, faux positif à argumenter) → \*\*compte rendu AVANT
     - attendre le go\*\* explicite. Justifier ce qui est écarté.

   En cas de doute sur la catégorie, traiter comme « architectural » (compte rendu avant).

6. **Après les corrections**, re-lancer `pnpm validate` si du code a changé, et **regrouper
   le lot en commits logiques**.
7. **Push avant de relancer Copilot** : ne JAMAIS re-demander une revue Copilot sur un head
   non poussé — sinon Copilot review du code périmé et re-signale du déjà-corrigé (round
   gaspillé). Séquence : lot de fixes → push → **une** re-demande → traiter tous les fils
   vivants en une passe → push. Éviter le ping-pong 1 commentaire/commit.
8. On ne merge qu'une fois ce tour terminé.

> Claude n'attend jamais Copilot de lui-même : il **rend la main à l'utilisateur** pour la
> création de PR, le push et l'attente de la revue, puis reprend sur le **go** explicite.
> Rappel : Copilot ne fait que **commenter**, il n'`APPROVE` jamais — une règle « 1 approving
> review » exige donc une **approbation humaine**, indépendante de Copilot.

**Détecter les retours périmés (outdated) vs vivants.** Un commentaire Copilot peut viser
du code déjà modifié depuis. Les fils de revue GitHub portent deux drapeaux (`isOutdated`,
`isResolved`) exposés par l'API GraphQL — les utiliser plutôt que de deviner :

```bash
gh api graphql -f query='
{ repository(owner: "MTES-MCT", name: "fonds-prevention-argile") {
    pullRequest(number: <PR>) {
      reviewThreads(first: 50) { nodes {
        isResolved isOutdated path line
        comments(first: 1) { nodes { author { login } body } }
      } } } } }' \
  --jq '.data.repository.pullRequest.reviewThreads.nodes[]
        | select(.comments.nodes[0].author.login=="copilot-pull-request-reviewer")
        | {outdated: .isOutdated, resolved: .isResolved, path, line, body: (.comments.nodes[0].body[0:80])}'
```

Règle de tri :

- **`isOutdated == false && isResolved == false`** → **retour vivant**, pointe encore le code
  courant : à traiter dans le compte rendu.
- **`isOutdated == true`** → le code sous le commentaire a changé depuis (souvent déjà
  corrigé ou déplacé) : à considérer comme traité, mais y jeter un œil pour confirmer que le
  changement répond bien au fond du commentaire (l'`isOutdated` est positionnel, pas
  sémantique).
- **`isResolved == true`** → fil explicitement résolu : ignorer.

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
- **Toujours travailler sur une branche dédiée, jamais committer sur `main`.** Avant le
  premier commit d'un lot de travail, vérifier la branche courante (`git branch --show-current`) :
  si c'est `main` (ou toute branche protégée), créer d'abord une branche dédiée
  (`git checkout -b <type>/<sujet>`, ex. `feat/arret-accompagnement`) et committer dessus.
  Ceci vaut aussi pour les retours QA sur une feature déjà mergée : repartir d'une branche
  neuve depuis `main` à jour. Si un commit a atterri sur `main` par erreur, le déplacer sur
  une branche (`git branch <feat>` puis `git branch -f main origin/main`) sans jamais push.
- **Par défaut, découper le travail en commits logiques** au fil de l'implémentation,
  sans attendre de demande explicite (un commit par changement cohérent : ex. schéma +
  migration, feature back, feature front, doc + bump de version). Préférer plusieurs
  petits commits ciblés à un gros commit fourre-tout.
- **Ne jamais `git push`** (ni `push --force`, ni création de PR distante) : les push
  sont gérés exclusivement par l'utilisateur. Se limiter au commit local.

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
- **Matomo ne rogne jamais ses périodes** : `period=week|month` sur une plage renvoie les semaines/mois **pleins** qui la recouvrent (vérifié : `date=2026-03-12,2026-06-10` renvoie la clé `2026-03-09,2026-03-15`). Sommer ces buckets sur une fenêtre glissante compte des jours hors période et fait partager la semaine frontière entre période courante et précédente. Toujours découper la fenêtre avec `decouperPeriodeMatomo` (`acquisition/domain/decoupage-periode.ts`) avant de sommer, et ne pas confondre borne Matomo (dernier jour **inclus**) et borne BDD (exclusive) — cf. `periode-window.ts` et ADR-0033
- `period=range` n'est pré-archivé qu'avec `archiving_custom_ranges` (désactivé par défaut) : sur notre instance il est recalculé à la demande, pire cas combiné à un `segment` département — cause principale des timeouts au changement de filtre. Un comptage **additif** (events) passe donc par `getGranulariteForPeriode` + somme ; un dédoublonnage (visiteurs uniques, `VisitsSummary.get`) n'est **pas** additif et reste en `range` (ADR-0033)
- Un timeout Matomo n'interrompt pas son archivage en tâche de fond : réessayer un peu plus tard réussit souvent. **Ne jamais mettre en cache un échec Matomo** (`fetchMatomoApiCached`), ça bloquerait ce contournement jusqu'à expiration du cache (ADR-0033, option D bis)
- Sur une réponse multi-sous-période, Matomo sérialise **parfois** `nb_visits` en string au lieu d'un nombre (pas systématiquement) : toujours `Number(...)` avant de sommer, sinon `0 + "234"` concatène (`"0234"`). Le typage `MatomoEventActionResponse`/`MatomoVisitsResponse` annonce `number` sans le garantir — le JSON entre par un `as T` non validé
- Les ids de champs DN ne sont communs entre environnements que pour les champs **antérieurs au clonage** de la démarche. Un champ ou une annotation ajouté à la main après coup a un id propre à chaque démarche (cas de l'annotation « lien FPA » et du champ « état de la maison » d'éligibilité, ADR-0025 et FLOW-AND-SYNC § 2.6.2). Toujours vérifier avec `pnpm ds:fetch-schema <numero>` avant de coder un id en dur — DN **ignore silencieusement** un `champ_` inconnu, le préremplissage échoue sans aucune erreur
- L'API Matomo répond **HTTP 200 même sur erreur d'authentification** (le verdict est dans le corps : `{"result":"error"}`) — ne jamais se fier au seul `response.ok`, et ne pas mettre ces réponses en cache HTTP
- `unstable_cache` **sérialise en JSON** : une valeur cachée contenant un `Date` revient en **string** au premier hit, pas au miss. Le bug ne se voit donc ni au premier chargement ni en test si le mock est un pass-through, mais casse le rendu ensuite (`date.getUTCFullYear is not a function`, constaté en staging sur `/stats`). N'y mettre que du JSON simple (ISO strings, nombres) et réhydrater côté appelant ; un mock de `unstable_cache` doit refaire l'aller-retour `JSON.parse(JSON.stringify(...))`

## Documentation contextuelle

Guides de référence détaillés, chargés en contexte via les références ci-dessous :

- @.claude/context/security-rules.md — Checklist sécurité (secrets, validation Zod, autorisation, SQL, logs)
- @docs/ARCHITECTURE.md — Vue d'ensemble (features, code partagé, routes, modèle de données)
- @docs/security/RBAC-ROLES.md — Rôles, permissions et espaces (FranceConnect/ProConnect)
- @docs/security/RBAC-TEST-PLAN.md — Plan de couverture RBAC (anti-fuite / anti-accès non désiré)
- @docs/parcours/FLOW-AND-SYNC.md — Flux et synchronisation du parcours
- @docs/security/snyk-accepted-vulnerabilities.md — Vulnérabilités acceptées (faux positifs)

Décisions d'architecture : voir `docs/adr/` (créer un ADR avec la skill `/adr`).
