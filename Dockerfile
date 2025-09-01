FROM node:22-alpine

# Activer pnpm
RUN corepack enable && corepack prepare pnpm@10.13.1 --activate

WORKDIR /app

# Copier uniquement les fichiers de dépendances
COPY package.json pnpm-lock.yaml ./

# Installer les dépendances
RUN pnpm install --frozen-lockfile

# Copier le reste de l'application (sera écrasé par les volumes en dev)
COPY . .

EXPOSE 3000

CMD ["pnpm", "start:dev"]