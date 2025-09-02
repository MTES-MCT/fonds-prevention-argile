# Fonds Prévention Argile

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
- `DEMARCHES_SIMPLIFIEES_API_KEY` : Clé d'API pour récupérer les informations de la plateforme Démarches Simplifiées
- `DEMARCHES_SIMPLIFIEES_API_URL` : URL de l'API de la plateforme Démarches Simplifiées
- `DEMARCHES_SIMPLIFIEES_ID_DEMARCHE` : Identifiant de la démarche liée au Fonds prévention Argile dans la plateforme Démarches Simplifiées

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
├── content/             # Contenus JSON
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

## Contribution

1. Créez une branche pour votre fonctionnalité
2. Assurez-vous que `pnpm validate` passe sans erreurs
3. Formatez votre code avec `pnpm format`
4. Créez une Pull Request avec une description claire

## Licence

[À définir]
