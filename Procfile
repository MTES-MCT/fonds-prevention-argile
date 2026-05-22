# NB : on bypasse pnpm au runtime — voir README "Déploiement Scalingo".
postdeploy: echo "Migrations..." && ./node_modules/.bin/tsx src/shared/database/migrate.ts && echo "Postdeploy termine"
web: ./node_modules/.bin/next start