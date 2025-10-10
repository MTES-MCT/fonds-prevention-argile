FROM node:22-alpine

# Installer pnpm globalement avec npm
RUN npm install -g pnpm@10.18.2

WORKDIR /app

# Copier les fichiers de dépendances
COPY package.json pnpm-lock.yaml ./

# Installer les dépendances
RUN pnpm install --frozen-lockfile

# Copier le reste
COPY . .

EXPOSE 3000

CMD ["pnpm", "start:dev"]