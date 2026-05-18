# Fonds prévention argile

Application web pour le Fonds de Prévention des Risques liés au Retrait-Gonflement des Argiles (RGA).

## Prérequis

- **Node.js** 22.x
- **pnpm** 10.13.1
- **Git** pour cloner le repository

## Installation

```bash
git clone https://github.com/MTES-MCT/fonds-prevention-argile
cd fonds-prevention-argile
pnpm install
```

## Configuration

### Variables d'environnement

Copiez le fichier `.env.example` vers `.env.local` :

```bash
cp .env.example .env.local
```

Configurez les variables selon votre environnement. Les principales variables incluent :

- `NODE_ENV` : Environnement d'exécution (`development` ou `production`)
- `NEXT_PUBLIC_MATOMO_SITE_ID` : ID Matomo pour l'analytics
- `NEXT_PUBLIC_MATOMO_URL` : URL de l'instance Matomo
- `DEMARCHES_SIMPLIFIEES_GRAPHQL_API_KEY` : Clé d'API pour récupérer les informations de la plateforme Démarches Simplifiées via GraphQL
- `DEMARCHES_SIMPLIFIEES_GRAPHQL_API_URL` : URL de l'API GRAPHQL de la plateforme Démarches Simplifiées
- `DEMARCHES_SIMPLIFIEES_REST_API_URL` : URL de l'API Rest de la plateforme Démarches Simplifiées
- `DEMARCHES_SIMPLIFIEES_ID_DEMARCHE` : Identifiant de la démarche liée au Fonds prévention argile dans la plateforme Démarches Simplifiées
- `DEMARCHES_SIMPLIFIEES_NOM_DEMARCHE` : Nom de la démarche liée au Fonds prévention argile dans la plateforme Démarches Simplifiées

### Configuration AMO par département (arrêté 2026)

Le mode d'AMO appliqué à chaque demandeur dépend de son département. La configuration est pilotée par 2 variables d'environnement optionnelles. Si elles ne sont pas définies, des valeurs par défaut alignées sur la dernière config produit sont utilisées.

| Variable                                       | Format        | Défaut             | Description                                                                                                  |
| ---------------------------------------------- | ------------- | ------------------ | ------------------------------------------------------------------------------------------------------------ |
| `NEXT_PUBLIC_DEPARTEMENTS_AMO_OBLIGATOIRE`     | CSV codes dept| `03,36,47,54,81`   | Départements où l'AMO est obligatoire (1 AMO auto-affecté à l'arrivée sur `/mon-compte`).                    |
| `NEXT_PUBLIC_DEPARTEMENTS_AV_AMO_FUSIONNES`    | CSV codes dept| _(vide)_           | Départements où l'aller-vers local joue aussi le rôle d'AMO (auto-attribution silencieuse). Optionnel.        |

**Tout département non listé dans ces deux variables retombe sur le mode `FACULTATIF`** : le demandeur choisit lui-même s'il souhaite être accompagné ("Oui" → 1er AMO du territoire, "Non" → skip vers Éligibilité).

**Format** : codes département séparés par virgules. Le zéro initial est optionnel (`03` et `3` sont équivalents). Exemples valides :

- `NEXT_PUBLIC_DEPARTEMENTS_AMO_OBLIGATOIRE=03,36,47,54,81`
- `NEXT_PUBLIC_DEPARTEMENTS_AV_AMO_FUSIONNES=` (vide explicite)
- `NEXT_PUBLIC_DEPARTEMENTS_AV_AMO_FUSIONNES=63` (pour basculer 63 en mode AV/AMO fusionnés)

**Côté Scalingo** : ces variables sont exposées au client (préfixe `NEXT_PUBLIC_`), donc un changement nécessite un rebuild de l'application (auto-déclenché par Scalingo lors d'une modification des env vars).

**Code source** : [`src/features/parcours/amo/domain/value-objects/departements-amo.ts`](src/features/parcours/amo/domain/value-objects/departements-amo.ts).

## Développement

### Démarrage du serveur de développement

```bash
pnpm start:dev
```

L'application sera disponible sur [http://localhost:3000](http://localhost:3000)

### Scripts disponibles

| Commande             | Description                                         |
| -------------------- | --------------------------------------------------- |
| `pnpm start:dev`     | Lance le serveur de développement                   |
| `pnpm build`         | Construit l'application pour la production          |
| `pnpm start`         | Démarre le serveur de production                    |
| `pnpm lint`          | Vérifie le code avec ESLint                         |
| `pnpm typecheck`     | Vérifie les types TypeScript                        |
| `pnpm test`          | Lance les tests unitaires                           |
| `pnpm test:watch`    | Lance les tests en mode watch                       |
| `pnpm test:coverage` | Lance les tests avec couverture                     |
| `pnpm format`        | Formate le code avec Prettier                       |
| `pnpm validate`      | Lance toutes les vérifications (types, lint, tests) |
| `pnpm clean`         | Nettoie le cache Next.js                            |
| `pnpm fresh`         | Réinstallation complète des dépendances             |

## Tests

```bash
# Lancer les tests une fois
pnpm test

# Mode watch pour le développement
pnpm test:watch

# Avec rapport de couverture
pnpm test:coverage

# Interface graphique des tests
pnpm test:ui
```

## Qualité du code

### Validation complète

```bash
pnpm validate
```

Cette commande exécute :

- Vérification des types TypeScript
- Linting avec ESLint
- Tests unitaires

### CI Pipeline

```bash
pnpm ci
```

Installe les dépendances avec lockfile et lance la validation complète.

## Documentation interne

Documentation technique détaillée dans `docs/` :

- [`docs/parcours/FLOW-AND-SYNC.md`](./docs/parcours/FLOW-AND-SYNC.md) — Flux du parcours utilisateur et synchronisation Démarches Simplifiées
- [`docs/partners/PARTNER-TRACKING.md`](./docs/partners/PARTNER-TRACKING.md) — **Suivi des partenaires intégrant l'iframe** (MAIF, etc.) : détection, persistance via cookie + champ `users.partner_source`, filtrage backoffice, et procédure pour ajouter un nouveau partenaire
- [`docs/testing/TESTING-AUTH.md`](./docs/testing/TESTING-AUTH.md) — Stratégie de tests pour l'authentification
- [`docs/testing/TESTING-SIMULATEUR.md`](./docs/testing/TESTING-SIMULATEUR.md) — Stratégie de tests pour le simulateur
- [`docs/security/snyk-accepted-vulnerabilities.md`](./docs/security/snyk-accepted-vulnerabilities.md) — Vulnérabilités acceptées suivies par Snyk

## Structure du projet

```
src/
├── app/                  # Pages et routes Next.js (App Router)
│   ├── accessibilite/
│   ├── admin/
│   ├── connexion/
│   ├── dashboard/
│   ├── mentions-legales/
│   ├── simulateur/
│   └── statistiques/
├── components/           # Composants React réutilisables
│   ├── DsfrProvider/    # Provider DSFR
│   ├── Header/
│   ├── Footer/
│   └── Matomo/          # Analytics
├── content/             # Contenus textuels (wording) de l'application
│   ├── accessibilityPage.json  # Textes page accessibilité
│   ├── components.json          # Textes composants réutilisables
│   ├── connexion.json           # Textes page connexion
│   ├── homePage.json            # Textes page d'accueil
│   ├── layout.json              # Textes layout (header, footer)
│   ├── legalNoticePage.json     # Textes mentions légales
│   ├── notFoundPage.json        # Textes page 404
│   ├── simulationPage.json      # Textes page simulateur
│   ├── statisticsPage.json      # Textes page statistiques
│   └── index.ts                 # Export centralisé
├── hooks/               # Hooks React personnalisés
├── lib/                 # Utilitaires et configuration
│   ├── api/            # Clients API (Démarches Simplifiées)
│   ├── config/         # Configuration environnement
│   └── utils/          # Fonctions utilitaires
├── page-sections/       # Sections spécifiques aux pages
│   └── home/           # Sections page d'accueil
├── styles/             # Styles globaux et fonts
└── types/              # Types TypeScript (si nécessaire)
```

## Gestion du contenu textuel

### Architecture du dossier `/content/`

Le dossier `src/content/` contient tous les textes de l'application sous forme de fichiers JSON. Cette architecture permet :

- **Modification facile des textes** : Les contenus peuvent être modifiés sans toucher au code React
- **Centralisation** : Tous les textes sont regroupés au même endroit
- **Collaboration simplifiée** : Les contributeurs non-techniques peuvent proposer des modifications via des Pull Requests sur ces fichiers JSON uniquement
- **Maintenabilité** : Séparation claire entre la logique d'affichage et le contenu éditorial

### Structure des fichiers JSON

Chaque fichier JSON correspond à une page ou un groupe de composants :
Exemple : homePage.json

```json
{
  "hero": {
    "title": "Fonds de prévention des risques liés au retrait-gonflement des argiles",
    "subtitle": "Protégez votre logement contre les effets de la sécheresse",
    "description": "Le service public qui vous accompagne..."
  },
  "sections": {
    "whatIsRGA": {
      "title": "Qu'est-ce que le RGA ?",
      "content": "Le retrait-gonflement des argiles..."
    }
  }
}
```

### Modification des contenus

Pour modifier un texte de l'application :

1. Identifiez le fichier JSON correspondant dans `src/content/`
2. Modifiez le texte souhaité
3. Créez une Pull Request avec vos modifications
4. Les modifications seront visibles après le déploiement

> **Note pour les contributeurs** : Il n'est pas nécessaire de connaître React ou TypeScript pour modifier les contenus textuels. Seuls les fichiers JSON dans le dossier `/content/` doivent être édités.

## Technologies

- **[Next.js](https://nextjs.org/)** 15.x - Framework React avec App Router
- **[React](https://react.dev/)** 19.x - Bibliothèque UI
- **[TypeScript](https://www.typescriptlang.org/)** 5.x - Typage statique
- **[Tailwind CSS](https://tailwindcss.com/)** 4.x - Framework CSS utilitaire
- **[DSFR](https://www.systeme-de-design.gouv.fr/)** 1.14.x - Design System de l'État
- **[Vitest](https://vitest.dev/)** - Tests unitaires
- **[Matomo](https://matomo.org/)** - Analytics

## Déploiement

### Build de production

```bash
pnpm build
pnpm start
```

### Déploiement Scalingo

L'app est déployée sur Scalingo via le [`nodejs-buildpack`](https://github.com/Scalingo/nodejs-buildpack) officiel. Le `Procfile` n'utilise **volontairement pas** `pnpm` au runtime — on appelle directement les shims `./node_modules/.bin/{next,tsx}`.

#### Pourquoi pas `pnpm start` ?

À chaque invocation, pnpm 11 exécute `runDepsStatusCheck`, un check d'intégrité interne du `node_modules`. Sur Scalingo, ce check détecte systématiquement une divergence après le packaging slug (le tar/détar de Scalingo casse les hardlinks que pnpm utilise pour son content-addressable store dans `node_modules/.pnpm/`). Pnpm décide alors de purger `node_modules` et de réinstaller les 637 packages — au boot du conteneur web. Trois symptômes possibles selon la config :

| Config pnpm | Comportement au boot | Résultat |
|---|---|---|
| Défaut | Prompt "purger ?" → pas de TTY → `ERR_PNPM_ABORTED_REMOVE_MODULES_DIR_NO_TTY` | App ne démarre jamais |
| `confirmModulesPurge: false` dans `pnpm-workspace.yaml` | Purge silencieuse + `pnpm install` → ~45s pour 637 packages | `SIGKILL` (timeout boot Scalingo = 60s) |
| `PNPM_SKIP_PRUNING=true` côté env Scalingo | Aucun effet : cette variable contrôle uniquement le prune au BUILD, pas le check runtime de pnpm | Idem ci-dessus |

Sources : [pnpm#9966](https://github.com/pnpm/pnpm/issues/9966) (breaking change v10.16+), [Scalingo nodejs-buildpack CHANGELOG](https://github.com/Scalingo/nodejs-buildpack/blob/master/CHANGELOG.md).

#### La solution

Le `Procfile` invoque directement les shims du `node_modules/.bin/`, sans passer par pnpm :

```procfile
postdeploy: ... ./node_modules/.bin/tsx src/shared/database/migrate.ts ...
web: ./node_modules/.bin/next start
```

**Attention** : ne pas préfixer par `node`. Les `.bin/*` sont des **shims shell** (`#!/bin/sh`) qui exécutent ensuite Node ; les invoquer via `node node_modules/.bin/next` fait crasher Node avec un `SyntaxError` (Node essaie de parser le bash comme du JS). Les shims utilisent `exec` en interne, donc `SIGTERM` se propage correctement à Node (le process shell est remplacé, pas wrappé).

Cette approche est aussi [explicitement recommandée par la doc Scalingo](https://doc.scalingo.com/languages/nodejs/start) : les wrappers package manager (pnpm/yarn/npm) ne forwardent pas correctement `SIGTERM` au process Node, ce qui empêche un shutdown gracieux ([pnpm#2653](https://github.com/pnpm/pnpm/issues/2653)).

#### Pré-requis

Pour que ce mécanisme fonctionne, **`next` et `tsx` doivent être en `dependencies`** (pas `devDependencies`) — sinon le buildpack les prune après le build et `node_modules/.bin/*` est vide au runtime.

#### Garde-fous résiduels

- `confirmModulesPurge: false` reste configuré dans `pnpm-workspace.yaml`. Inutile pour le démarrage du conteneur web (pnpm n'y tourne plus), mais filet de sécurité pour les commandes one-shot (`scalingo run pnpm ...`).
- Si quelqu'un re-introduit `pnpm` dans le `Procfile` un jour, les trois symptômes ci-dessus reviendront. Garder `node node_modules/.bin/*` comme convention.

### Tester les emails sur staging

Sur staging, les utilisateurs FranceConnect Sandbox ont des emails synthétiques non monitorables, donc impossible de vérifier les mails envoyés par l'app. La variable `EMAIL_DEV_INBOX` redirige tous les mails Brevo vers **une boîte privée de ton choix**, en gardant Brevo en transport (iso-prod). Le destinataire original apparaît dans le sujet : `[STAGING → real@target.com] <sujet>`.

```bash
scalingo --app fonds-argile-staging env-set EMAIL_DEV_INBOX=ta-boite-privee@example.fr
scalingo --app fonds-argile-staging env-unset EMAIL_DEV_INBOX     # pour désactiver
```

Au boot, le log `[EMAIL] DEV REDIRECT ACTIVE (env=staging) → ...` confirme l'activation.

**Garde-fous** (`assertEmailDevInboxSafety` dans `env.config.ts`) :
- L'app **refuse de démarrer** si `EMAIL_DEV_INBOX` est setée en production.
- Seul le domaine `@beta.gouv.fr` est accepté comme destination (allowlist hardcodée). Pour ajouter un domaine : modifier `ALLOWED_DEV_INBOX_DOMAINS` dans le code.
- En local, Mailhog ([localhost:8025](http://localhost:8025)) reste actif ; `EMAIL_DEV_INBOX` n'agit que sur la branche Brevo.

**Pourquoi pas Mailhog sur staging ?** Pour garder Brevo (templates, deliverability, bounces, rate limits) réellement dans la boucle — sinon staging perd sa raison d'être. À reconsidérer si le quota Brevo sature.

**Code** : `src/shared/email/utils/dev-redirect.utils.ts` (helper), appelé dans `sendViaBrevo` de `email.service.ts`.

### Docker

Build et lancement avec Docker Compose :

```bash
docker-compose up --build
```

### Synchronisation des parcours

> Documentation de référence détaillée : [`docs/parcours/FLOW-AND-SYNC.md`](docs/parcours/FLOW-AND-SYNC.md) (modèle d'état, transitions, architecture sync, décisions).

#### Vue d'ensemble

Un parcours a deux niveaux d'état :

| Niveau            | Champ                                | Source de vérité                 |
| ----------------- | ------------------------------------ | -------------------------------- |
| Dossier DS        | `dossiers_demarches_simplifiees.ds_status` | API Démarches Simplifiées        |
| Parcours interne  | `parcours_prevention.current_status` | Dérivé du dossier de `current_step` |
| Parcours interne  | `parcours_prevention.current_step`   | Logique métier (progression)     |

La sync ramène les statuts DS dans la BDD locale puis recalcule l'état interne du parcours. Quand le statut interne devient `valide`, le parcours avance automatiquement à l'étape suivante.

#### Architecture du service de sync

Trois fonctions dans `src/features/parcours/dossiers-ds/services/ds-sync.service.ts`, à responsabilités séparées :

1. **`syncDossierStatus(parcoursId, step, dsNumber)`** — appelle l'API DS pour un dossier donné, met à jour la table `dossiers_demarches_simplifiees`. **Ne touche pas** au `current_status` du parcours.
2. **`recomputeParcoursStatus(parcoursId)`** — lit le dossier de l'étape courante (`current_step`), mappe son `ds_status` vers un statut interne (`DS_TO_INTERNAL_STATUS`) et écrit `parcours.current_status`. À appeler après une (ou plusieurs) sync. Si `current_step` n'a pas de dossier (cas de `choix_amo`), ne fait rien.
3. **`syncAllDossiers(parcoursId, dossiers)`** — boucle `syncDossierStatus` sur tous les dossiers, puis appelle `recomputeParcoursStatus` une fois.

Cette séparation évite que la sync d'un dossier d'étape précédente ou future écrase le `current_status` calculé pour l'étape courante. **Règle** : tout appel à `syncDossierStatus` doit être suivi d'un `recomputeParcoursStatus` (manuel ou via `syncAllDossiers`).

#### Déclencheurs

- **CRON GitHub Actions** (3 fois par jour : 06:15, 13:15 et 16:15 UTC, ≈ matin / début d'après-midi / fin de journée FR) — itère tous les parcours actifs (`archived_at IS NULL AND completed_at IS NULL`), synchronise leurs dossiers, recalcule, fait progresser si nécessaire, et écrit l'historique dans `sync_runs` / `sync_run_entries`.
- **UI demandeur** (`syncUserDossierStatus`, `syncAllUserDossiers`) — déclenché à la connexion / au refresh manuel.
- **Super-admin** (`/administration/synchronisations`, bouton « Lancer une synchro maintenant ») — utilise le même service que le CRON, marqué `triggered_by = manual`.

#### Configuration GitHub Actions

Workflow : [`.github/workflows/cron-sync-parcours.yml`](.github/workflows/cron-sync-parcours.yml).

Le workflow utilise une **matrix [staging, production]** sur les **GitHub Environments** pour scoper les secrets par environnement.

**Setup côté GitHub** (à faire une seule fois, par un admin du repo) :

1. Settings → Environments → créer `staging` et `production`.
2. Pour chaque environment, ajouter :
   - **Secret** `CRON_SECRET` : secret aléatoire ≥ 32 caractères, identique à celui configuré côté Scalingo de l'env. Générer avec `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.
   - **Variable** `APP_URL` : URL publique de l'app (ex : `https://fonds-argile-staging.osc-fr1.scalingo.io` pour staging, URL prod pour production).
3. Côté Scalingo (chaque app), ajouter la même variable d'env `CRON_SECRET` que celle configurée dans GitHub. `APP_URL` n'est pas nécessaire côté Scalingo (c'est juste le destinataire du curl).

**Déclenchement manuel** : Actions → CRON sync parcours → "Run workflow" → confirme.

**Endpoint** appelé : `POST /api/cron/sync-parcours`, protégé par `Authorization: Bearer $CRON_SECRET`.

#### Vue d'historique

`/administration/synchronisations` (super-admin uniquement) affiche :

- la liste paginée des runs (date, durée, statut succès/partiel/erreur, trigger CRON/manuel, totaux) ;
- le détail d'un run avec, pour chaque parcours touché, les transitions d'étape, les changements DS détectés et l'éventuelle erreur.

#### Tables associées

- `sync_runs` — un run par déclenchement (id, started_at, finished_at, status, triggered_by, totaux, error_summary).
- `sync_run_entries` — une entrée par parcours **modifié** durant un run (transitions step/status, liste des `ds_status_changes`, flag `step_advanced`, erreur).

Les parcours non modifiés ne génèrent pas d'entrée — seuls les runs eux-mêmes sont systématiquement enregistrés.

## Dépannage

### Problèmes de cache

```bash
# Nettoyer le cache Next.js
pnpm clean

# Réinstallation complète
pnpm fresh
```

### Erreurs courantes

- **Variables d'environnement manquantes** : Vérifiez que `.env.local` existe et contient toutes les variables requises
- **Erreurs TypeScript** : Lancez `pnpm typecheck` pour identifier les problèmes
- **Tests qui échouent** : Utilisez `pnpm test:watch` pour débugger

## Sécurité et qualité du code

### Husky (Git hooks)

Le projet utilise **Husky** pour automatiser les vérifications avant chaque commit :

- Installation automatique lors du `pnpm install`
- Exécute les validations définies dans `.husky/pre-commit`
- Empêche les commits si les tests ou le linting échouent

### Talisman (Protection des secrets)

**Talisman** protège contre la fuite accidentelle de secrets dans le code :

```bash
# Vérifier manuellement tout le repository
pnpm talisman:check

# Exécuté automatiquement avant chaque commit
pnpm precommit
```

Configuration dans `.talismanrc` pour les exceptions et les fichiers à ignorer.

> **Important** : Ne jamais contourner Talisman sans vérification. Si un fichier est bloqué, vérifiez qu'il ne contient pas de données sensibles avant de l'ajouter aux exceptions.

## 🔐 Gestion des données RGA en mode embed

### Contexte

Le simulateur RGA peut être intégré en iframe sur des sites partenaires. Lorsque l'utilisateur termine sa simulation, il doit être redirigé vers notre page de connexion pour créer son compte. Problème : `window.open()` crée un **nouveau contexte avec un localStorage vide**, les données de la simulation sont donc perdues.

### Solution : Chiffrement dans l'URL

**Flow en mode embed :**

```
1. Iframe → Simulation terminée
   └─ Chiffrement AES-256-GCM côté serveur (Server Action)
   └─ URL générée : /connexion#d=abc123:def456:ghi789...

2. Nouvel onglet → Page /connexion
   └─ Déchiffrement des données (Server Action)
   └─ Sauvegarde en localStorage
   └─ Nettoyage de l'URL (hash fragment)

3. Après connexion FranceConnect
   └─ Migration automatique localStorage → Base de données
   └─ Nettoyage du localStorage
```

**Sécurité :**

- ✅ Chiffrement AES-256-GCM avec clé secrète côté serveur
- ✅ Hash fragment (`#d=...`) jamais envoyé au serveur
- ✅ URL nettoyée immédiatement après lecture
- ✅ Données temporaires uniquement

**Fichiers concernés :**

- `src/features/simulateur-rga/services/encryption.service.ts` - Service de chiffrement/déchiffrement
- `src/features/simulateur-rga/actions/encrypt-rga-data.actions.ts` - Server Action chiffrement
- `src/features/simulateur-rga/actions/decrypt-rga-data.actions.ts` - Server Action déchiffrement
- `src/features/simulateur-rga/components/SimulateurClient.tsx` - Gestion mode embed
- `src/features/parcours/core/context/ParcoursProvider.tsx` - Déchiffrement et migration BDD

**Variables d'environnement :**

```bash
# Clé de chiffrement (32 bytes en hexadécimal - 64 caractères)
# Générer avec : node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
RGA_ENCRYPTION_KEY=a1b2c3d4e5f6...
```

**Note :** En mode normal (sans iframe), les données transitent directement via localStorage sans passer par l'URL, le chiffrement n'est donc pas utilisé.

## Contribution

1. Créez une branche pour votre fonctionnalité
2. Assurez-vous que `pnpm validate` passe sans erreurs
3. Formatez votre code avec `pnpm format`
4. Créez une Pull Request avec une description claire

**Note** : Les hooks Husky et Talisman s'exécutent automatiquement lors du commit pour garantir la qualité et la sécurité du code.

### Contribution aux contenus textuels

Si vous souhaitez uniquement modifier des textes de l'application :

1. Créez une branche pour vos modifications
2. Éditez les fichiers JSON dans `src/content/`
3. Créez une Pull Request en décrivant les changements apportés
4. Aucune connaissance technique n'est requise pour ce type de contribution

## Sécurité des dépendances

Ce projet applique plusieurs couches de protection contre les attaques de type supply chain (ex : `shai-hulud`, `mini-shai-hulud` qui a touché l'écosystème `@tanstack/*` en mai 2026).

### Configuration `.npmrc`

| Option               | Valeur  | Protection                                                                                                                                  |
| -------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `ignore-scripts`     | `true`  | Bloque l'exécution automatique des scripts `postinstall`, `preinstall`, etc. Empêche l'exécution de code malveillant lors de l'installation |
| `auto-install-peers` | `false` | Désactive l'installation automatique des peer dependencies, évitant l'ajout silencieux de packages non audités                              |

### Configuration `pnpm-workspace.yaml`

| Option                | Valeur                         | Protection                                                                                                                                |
| --------------------- | ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `savePrefix`          | `~`                            | Force `pnpm add` à figer le minor/major (ex : `5.1.~3`). Sans ça, par défaut, `pnpm add` ouvre la porte aux minor (`^`)                   |
| `minimumReleaseAge`   | `10080` (7 j)                  | Refuse les versions publiées depuis moins de 7 jours (cf. ci-dessous)                                                                     |
| `minimumReleaseAgeExclude` | liste                     | Packages exemptés du délai (ex : `next`, `@next/swc-*`) parce qu'on veut leurs hotfix immédiats et qu'on a confiance dans leur pipeline   |
| `trustPolicy`         | `no-downgrade`                 | Refuse les downgrades silencieux d'une dépendance déjà installée (un attaquant ne peut pas rétrograder un transitif vers une CVE connue)  |
| `trustPolicyExclude`  | liste                          | Exceptions runtime-safe documentées (ex : `undici-types`, `semver@6` transitif `@babel/core`) — chaque entrée a un commentaire de justif  |
| `overrides`           | map                            | Force des versions patchées pour les CVE transitives connues (vite, rollup, minimatch, picomatch, ajv, esbuild, etc.)                     |
| `allowBuilds`         | map `pkg: true`                | Approbation explicite des scripts d'install natifs (pnpm 11+). Sans ça, toute compilation native est silencieusement bloquée              |

> **Note pnpm 11** : `onlyBuiltDependencies` (allow-list utilisée en pnpm 9-10) n'est plus respectée par pnpm 11 — c'est `allowBuilds` qui prend le relais. Si on essayait de garder les deux, ça doublonnerait sans rien apporter.

### `minimumReleaseAge` — quarantine de 7 jours

C'est la mesure la plus défensive du projet. Concrètement :

- Une dépendance ne peut être installée par `pnpm install` / `pnpm add` que si **sa version est publiée sur npm depuis au moins 7 jours**.
- Toute version plus récente est rejetée (sauf si le package est listé dans `minimumReleaseAgeExclude`).
- Cela suppose qu'une version malveillante publiée par un attaquant sera détectée et yankée par npm avant que ce délai n'expire (en pratique, la communauté + Socket.dev + GitHub Security Advisories détectent ce genre d'attaque en quelques heures à 2-3 jours).

**Cas concret — attaque TanStack du 11 mai 2026** : 84 versions malveillantes de 14 packages `@tanstack/*` ont été publiées vers 19:20 UTC, détectées et yankées dans les heures qui suivent. Un `pnpm install` lancé pendant cette fenêtre **sans** `minimumReleaseAge` aurait pull les versions compromises. Avec `minimumReleaseAge: 10080`, la fenêtre d'install n'aurait été possible qu'à partir du 18 mai — bien après le yank.

**Côté CI** : la même règle s'applique sur les Pull Requests, ce qui empêche un attaquant qui a publié hier d'arriver en main aujourd'hui via une PR de bot type `dependabot --auto-merge`.

**Pour contourner ponctuellement** : `pnpm install --no-frozen-lockfile --ignore-min-release-age` (interactif, à ne **pas** ajouter au CI). Ou ajouter le package incriminé à `minimumReleaseAgeExclude` avec un commentaire justifiant l'urgence.

### Packages autorisés pour les builds natifs (`allowBuilds`)

| Package         | Pourquoi                                                                                              |
| --------------- | ----------------------------------------------------------------------------------------------------- |
| `argon2`        | Hashing de mot de passe (auth ProConnect). Postinstall `node-gyp-build` qui résout des prebuilts.     |
| `esbuild`       | Bundler de Vitest et Next. Postinstall qui télécharge le binaire Go pour la plateforme courante.       |
| `sharp`         | Traitement d'images (génération d'images OG, vignettes). Postinstall qui résout des bindings C++.    |
| `unrs-resolver` | Resolver transitif (stack Next/Oxc). Postinstall qui sélectionne le bon binaire natif Rust.           |

Les `@next/swc-*` ne sont **pas** listés ici : ils n'ont pas de script `install`/`postinstall` côté npm (les binaires sont téléchargés directement par pnpm sans hook), donc rien à approuver.

### Lockfile à intégrité SHA-512

`pnpm-lock.yaml` contient un hash `sha512` pour chaque tarball. Même si un mainteneur d'un package que nous utilisons était compromis demain et republiait une version tamperée **avec le même numéro de version**, pnpm refuserait l'install (mismatch d'intégrité). C'est ce qui rend la combinaison `lockfile committé` + `pnpm install --frozen-lockfile` (utilisée en CI) immune aux republications silencieuses.
