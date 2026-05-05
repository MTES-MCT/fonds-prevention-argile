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

Ce projet applique des mesures de protection contre les attaques de type supply chain (ex: shai-hulud).

### Configuration `.npmrc`

| Option               | Valeur  | Protection                                                                                                                                  |
| -------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `ignore-scripts`     | `true`  | Bloque l'exécution automatique des scripts `postinstall`, `preinstall`, etc. Empêche l'exécution de code malveillant lors de l'installation |
| `auto-install-peers` | `false` | Désactive l'installation automatique des peer dependencies, évitant l'ajout silencieux de packages non audités                              |

### Configuration `pnpm-workspace.yaml`

| Option                  | Valeur         | Protection                                                                                                                |
| ----------------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `savePrefix`            | `~`            | Limite les mises à jour automatiques aux versions patch uniquement (ex: `5.1.x`). Évite les breaking changes inattendus   |
| `minimumReleaseAge`     | `10080`        | Refuse les packages publiés depuis moins de 7 jours. Laisse le temps à la communauté de détecter des versions compromises |
| `trustPolicy`           | `no-downgrade` | Empêche la republication d'une version existante avec un contenu différent (attaque par remplacement)                     |
| `onlyBuiltDependencies` | whitelist      | Seuls les packages listés peuvent exécuter des scripts de build natifs. Tous les autres sont bloqués                      |

### Packages autorisés pour les builds natifs

- `@next/swc-*` : Compilateur SWC de Next.js (binaires Rust)
- `esbuild` : Bundler (binaire Go)
- `sharp` : Traitement d'images (bindings C++)
