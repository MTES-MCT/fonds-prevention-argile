//  Routes de l'application
export const ROUTES = {
  // Pages publiques
  home: "/",
  simulateur: "/simulateur",
  mentionsLegales: "/mentions-legales",
  cgu: "/cgu",
  politiqueConfidentialite: "/politique-confidentialite",
  accessibilite: "/accessibilite",
  donneesPersonnelles: "/donnees-personnelles",
  documentation: {
    integrationIframe: "/documentation/integration-iframe",
  },

  // Authentification
  connexion: {
    particulier: "/connexion",
    agent: "/connexion/agent",
  },
  deconnexion: "/deconnexion",

  // Espace Particulier (FranceConnect)
  particulier: {
    monCompte: "/mon-compte",
    mesDossiers: "/mes-dossiers",
    mesDemandes: "/mes-demandes",
  },

  // Backoffice Agents (ProConnect)
  backoffice: {
    // Administration (Administrateurs)
    administration: {
      root: "/administration",
      utilisateurs: "/administration/utilisateurs",
      statistiques: "/administration/statistiques",
      amos: "/administration/amos",
      eligibilite: "/administration/eligibilite",
      diagnostic: "/administration/diagnostic",
      devis: "/administration/devis",
      factures: "/administration/factures",
    },

    // Espace AMO (Agents AMO)
    espaceAmo: {
      root: "/espace-amo",
      notifications: "/espace-amo/notifications",
      dossiers: "/espace-amo/dossiers",
    },

    // Instruction (Instructeurs)
    instruction: {
      root: "/instruction",
      dossiers: "/instruction/dossiers",
      dossier: (id: string) => `/instruction/dossiers/${id}` as const,
    },
  },

  // Validation AMO (lien externe envoyé par email)
  amoValidation: {
    root: "/amo/validation",
    token: (token: string) => `/amo/validation/${token}` as const,
  },
  // API Routes
  api: {
    auth: {
      check: "/api/auth/check",
      fc: {
        callback: "/api/auth/fc/callback",
        login: "/api/auth/fc/login",
        logout: "/api/auth/fc/logout",
      },
      pc: {
        callback: "/api/auth/pc/callback",
        login: "/api/auth/pc/login",
        logout: "/api/auth/pc/logout",
      },
    },
    health: "/api/health",
    webhooks: {
      brevo: "/api/webhooks/brevo",
    },
  },

  // OIDC Callback (FranceConnect)
  oidcCallback: "/oidc-callback",
} as const;

// Routes protégées par rôle
export const PROTECTED_ROUTES = {
  // Routes agents (ProConnect) - tous les rôles agents peuvent accéder
  admin: [
    ROUTES.backoffice.administration.root,
    ROUTES.backoffice.espaceAmo.root,
    ROUTES.backoffice.instruction.root,
    "/api/private",
    "/test",
  ],
  // Routes particuliers (FranceConnect)
  particulier: [ROUTES.particulier.monCompte, ROUTES.particulier.mesDossiers, ROUTES.particulier.mesDemandes],
} as const;

// Routes publiques
export const PUBLIC_ROUTES = {
  auth: [ROUTES.connexion.particulier, ROUTES.connexion.agent, "/inscription"],
  franceConnectApi: [
    ROUTES.api.auth.fc.callback,
    ROUTES.api.auth.fc.login,
    ROUTES.api.auth.fc.logout,
    ROUTES.oidcCallback,
  ],
  proConnectApi: [ROUTES.api.auth.pc.callback, ROUTES.api.auth.pc.login, ROUTES.api.auth.pc.logout],
  static: [
    ROUTES.home,
    ROUTES.mentionsLegales,
    ROUTES.cgu,
    ROUTES.politiqueConfidentialite,
    ROUTES.accessibilite,
    ROUTES.donneesPersonnelles,
    ROUTES.documentation.integrationIframe,
  ],
} as const;

// Redirections par défaut selon le contexte
export const DEFAULT_REDIRECTS = {
  // Par rôle agent
  administrateur: ROUTES.backoffice.administration.root,
  amo: ROUTES.backoffice.espaceAmo.root,
  instructeur: ROUTES.backoffice.instruction.root,

  // Particulier
  particulier: ROUTES.particulier.monCompte,

  // Génériques
  login: ROUTES.connexion.particulier,
  loginAgent: ROUTES.connexion.agent,
  home: ROUTES.home,
  afterLogout: ROUTES.home,
} as const;
