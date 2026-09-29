//  Routes de l'application
export const ROUTES = {
  // Pages publiques
  home: "/",
  simulateur: "/simulateur",
  conseillers: "/trouver-mon-conseiller-local",
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
    maSimulation: "/mon-compte/simulation",
    mesDossiers: "/mes-dossiers",
    mesDemandes: "/mes-demandes",
  },

  // Backoffice Agents (ProConnect)
  backoffice: {
    // Administration (Administrateurs)
    administration: {
      root: "/administration",
    },

    // Espace agent (AMO, Aller-vers, analyste départemental, super-admin)
    espaceAgent: {
      root: "/espace-agent",
      dossiers: "/espace-agent/dossiers",
      dossier: (id: string) => `/espace-agent/dossiers/${id}` as const,
      demande: (id: string) => `/espace-agent/demandes/${id}` as const,
      validation: (token: string) => `/espace-agent/validation/${token}` as const,
      prospects: "/espace-agent/prospects",
      prospect: (id: string) => `/espace-agent/prospects/${id}` as const,
      editionDonneesSimulation: (dossierId: string) => `/espace-agent/edition-donnees-simulation/${dossierId}` as const,
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
  admin: [ROUTES.backoffice.administration.root, ROUTES.backoffice.espaceAgent.root],
  // Routes particuliers (FranceConnect)
  particulier: [ROUTES.particulier.monCompte, ROUTES.particulier.mesDossiers, ROUTES.particulier.mesDemandes],
} as const;

// Routes publiques
export const PUBLIC_ROUTES = {
  auth: [ROUTES.connexion.particulier, ROUTES.connexion.agent],
  franceConnectApi: [
    ROUTES.api.auth.fc.callback,
    ROUTES.api.auth.fc.login,
    ROUTES.api.auth.fc.logout,
    ROUTES.oidcCallback,
  ],
  proConnectApi: [ROUTES.api.auth.pc.callback, ROUTES.api.auth.pc.login, ROUTES.api.auth.pc.logout],
  static: [
    ROUTES.home,
    ROUTES.conseillers,
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
  super_administrateur: ROUTES.backoffice.administration.root,
  administrateur: ROUTES.backoffice.administration.root,
  analyste: ROUTES.backoffice.administration.root,
  // Agents terrain : atterrissage direct sur la page dossiers (espace-agent → /espace-agent/dossiers).
  amo: ROUTES.backoffice.espaceAgent.root,
  allers_vers: ROUTES.backoffice.espaceAgent.root,
  amo_et_allers_vers: ROUTES.backoffice.espaceAgent.root,

  // Particulier
  particulier: ROUTES.particulier.monCompte,

  // Génériques
  login: ROUTES.connexion.particulier,
  loginAgent: ROUTES.connexion.agent,
  home: ROUTES.home,
  afterLogout: ROUTES.home,
} as const;
