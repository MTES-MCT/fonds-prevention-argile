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
- `NEXT_PUBLIC_SENTRY_DSN` : DSN Sentry pour le monitoring d'erreurs
- `DEMARCHES_SIMPLIFIEES_GRAPHQL_API_KEY` : Clé d'API pour récupérer les informations de la plateforme Démarches Simplifiées via GraphQL
- `DEMARCHES_SIMPLIFIEES_GRAPHQL_API_URL` : URL de l'API GRAPHQL de la plateforme Démarches Simplifiées
- `DEMARCHES_SIMPLIFIEES_REST_API_URL` : URL de l'API Rest de la plateforme Démarches Simplifiées
- `DEMARCHES_SIMPLIFIEES_ID_DEMARCHE` : Identifiant de la démarche liée au Fonds prévention argile dans la plateforme Démarches Simplifiées
- `DEMARCHES_SIMPLIFIEES_NOM_DEMARCHE` : Nom de la démarche liée au Fonds prévention argile dans la plateforme Démarches Simplifiées

## Développement

### Démarrage du serveur de développement

```bash
pnpm start:dev
```

L'application sera disponible sur [http://localhost:3000](http://localhost:3000)

### Scripts disponibles

| Commande | Description |
|----------|-------------|
| `pnpm start:dev` | Lance le serveur de développement |
| `pnpm build` | Construit l'application pour la production |
| `pnpm start` | Démarre le serveur de production |
| `pnpm lint` | Vérifie le code avec ESLint |
| `pnpm typecheck` | Vérifie les types TypeScript |
| `pnpm test` | Lance les tests unitaires |
| `pnpm test:watch` | Lance les tests en mode watch |
| `pnpm test:coverage` | Lance les tests avec couverture |
| `pnpm format` | Formate le code avec Prettier |
| `pnpm validate` | Lance toutes les vérifications (types, lint, tests) |
| `pnpm clean` | Nettoie le cache Next.js |
| `pnpm fresh` | Réinstallation complète des dépendances |

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
- **[Sentry](https://sentry.io/)** - Monitoring d'erreurs
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
