// Routes protégées par rôle
export const PROTECTED_ROUTES = {
  admin: ["/administration", "/dashboard", "/api/private", "/test"],
  particulier: ["/mon-compte", "/mes-dossiers", "/mes-demandes"],
} as const;

// Routes publiques
export const PUBLIC_ROUTES = {
  auth: ["/connexion", "/inscription"],
  franceConnectApi: [
    "/api/auth/fc/callback",
    "/api/auth/fc/login",
    "/api/auth/fc/logout",
    "/oidc-callback",
  ],
  static: ["/", "/mentions-legales", "/cgu", "/politique-confidentialite", "/accessibilite", "/donnees-personnelles"],
} as const;

// Redirections par défaut
export const DEFAULT_REDIRECTS = {
  admin: "/administration",
  particulier: "/mon-compte",
  login: "/connexion",
  home: "/",
  afterLogout: "/",
} as const;
