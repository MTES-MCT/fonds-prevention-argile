FROM node:24-alpine

# Mettre a jour les paquets systeme Alpine (corrige les CVE openssl/libssl3)
RUN apk upgrade --no-cache

# Installer pnpm globalement avec npm (aligne sur packageManager du repo)
RUN npm install -g pnpm@11.5.2

WORKDIR /app

# Copier les fichiers de dépendances (pnpm-workspace.yaml porte les overrides)
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Installer les dépendances
RUN pnpm install --frozen-lockfile

# Copier le reste
COPY . .

EXPOSE 3000

CMD ["pnpm", "start:dev"]