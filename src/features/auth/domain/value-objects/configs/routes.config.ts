// Routes protégées par rôle
export const PROTECTED_ROUTES = {
  // Routes agents (ProConnect) - toutes redirigent via /espace-agent
  admin: [
    "/espace-agent",
    "/admin",
    "/instruction",
    "/espace-amo",
    "/administration", // Legacy - TODO à supprimer après migration
    "/api/private",
    "/test",
  ],
  // Routes particuliers (FranceConnect)
  particulier: ["/mon-compte", "/mes-dossiers", "/mes-demandes"],
} as const;

// Routes publiques
export const PUBLIC_ROUTES = {
  auth: ["/connexion", "/inscription"],
  franceConnectApi: ["/api/auth/fc/callback", "/api/auth/fc/login", "/api/auth/fc/logout", "/oidc-callback"],
  proConnectApi: ["/api/auth/pc/callback", "/api/auth/pc/login", "/api/auth/pc/logout"],
  static: [
    "/",
    "/mentions-legales",
    "/cgu",
    "/politique-confidentialite",
    "/accessibilite",
    "/donnees-personnelles",
    "/documentation/integration-iframe",
  ],
} as const;

// Redirections par défaut
export const DEFAULT_REDIRECTS = {
  admin: "/espace-agent", // Point d'entrée unique agents
  particulier: "/mon-compte",
  login: "/connexion",
  home: "/",
  afterLogout: "/",
} as const;
