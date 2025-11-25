import { z } from "zod";

/**
 * Configuration et validation des variables d'environnement
 */

// ==========================================
// Helpers d'environnement (runtime)
// ==========================================

export const isClient = (): boolean => {
  return typeof window !== "undefined";
};

export const isServer = (): boolean => {
  return typeof window === "undefined";
};

export const isDev = (): boolean => {
  return process.env.NODE_ENV === "development";
};

export const isProd = (): boolean => {
  return process.env.NODE_ENV === "production";
};

export const isTest = (): boolean => {
  return process.env.NODE_ENV === "test";
};

/**
 * Helper pour exécuter du code uniquement côté client
 */
export const runOnClient = (callback: () => void): void => {
  if (isClient()) {
    callback();
  }
};

/**
 * Helper pour exécuter du code uniquement côté serveur
 */
export const runOnServer = (callback: () => void): void => {
  if (isServer()) {
    callback();
  }
};

// ==========================================
// Schémas de validation Zod
// ==========================================

// Schéma de validation des variables d'environnement FranceConnect
const franceConnectEnvSchema = z.object({
  // Identifiants FranceConnect
  FC_CLIENT_ID: z.string().min(1, "FC_CLIENT_ID est requis"),
  FC_CLIENT_SECRET: z.string().min(1, "FC_CLIENT_SECRET est requis"),

  // URL FranceConnect
  FC_BASE_URL: z.string().url("FC_BASE_URL doit être une URL valide"),

  // URLs de callback
  FC_CALLBACK_URL: z.string().url("FC_CALLBACK_URL doit être une URL valide"),
  FC_POST_LOGOUT_URL: z.string().url("FC_POST_LOGOUT_URL doit être une URL valide"),

  // Scopes (optionnel avec valeur par défaut)
  FC_SCOPES: z.string().default("openid given_name family_name email"),

  // Sécurité
  FC_STATE_TTL: z.string().transform(Number).default("300"),
  FC_ACR_VALUES: z.string().default("eidas1"),
});

// Schéma de validation des variables d'environnement ProConnect
const proConnectEnvSchema = z.object({
  // Identifiants ProConnect
  PC_CLIENT_ID: z.string().min(1),
  PC_CLIENT_SECRET: z.string().min(1),

  // URL ProConnect
  PC_BASE_URL: z.string().url(),

  // URLs de callback
  PC_CALLBACK_URL: z.string().url(),
  PC_POST_LOGOUT_URL: z.string().url(),

  // Scopes (optionnel avec valeur par défaut)
  PC_SCOPES: z.string().default("openid email"),

  // Sécurité
  PC_STATE_TTL: z.coerce.number().default(300),
  PC_ACR_VALUES: z.string().default("eidas1"),
});

// Schéma de validation des variables d'environnement côté serveur
const serverSchema = z.object({
  NEXT_TELEMETRY_DISABLED: z.string().optional(),
  DEMARCHES_SIMPLIFIEES_GRAPHQL_API_KEY: z.string().min(1),
  DEMARCHES_SIMPLIFIEES_GRAPHQL_API_URL: z
    .string()
    .url()
    .default("https://www.demarches-simplifiees.fr/api/v2/graphql"),
  DEMARCHES_SIMPLIFIEES_REST_API_URL: z.string().url().default("https://www.demarches-simplifiees.fr/api/public/v1"),

  // Configuration des 4 démarches dans DS
  DEMARCHES_SIMPLIFIEES_ID_ELIGIBILITE: z.string().min(1),
  DEMARCHES_SIMPLIFIEES_NOM_ELIGIBILITE: z.string().min(1),
  DEMARCHES_SIMPLIFIEES_ID_DIAGNOSTIC: z.string().min(1),
  DEMARCHES_SIMPLIFIEES_NOM_DIAGNOSTIC: z.string().min(1),
  DEMARCHES_SIMPLIFIEES_ID_DEVIS: z.string().min(1),
  DEMARCHES_SIMPLIFIEES_NOM_DEVIS: z.string().min(1),
  DEMARCHES_SIMPLIFIEES_ID_FACTURES: z.string().min(1),
  DEMARCHES_SIMPLIFIEES_NOM_FACTURES: z.string().min(1),

  // Clés API Matomo pour le tracking
  MATOMO_API_TOKEN: z.string().min(1),
  MATOMO_MES_AIDES_RENO_SITE_ID: z.string().min(1),
  MATOMO_MES_AIDES_RENO_FUNNEL_ID: z.string().min(1),
  MATOMO_MES_AIDES_RENO_API_TOKEN: z.string().min(1),

  // Clé API Brevo pour l'envoi d'emails + configuration de l'expéditeur
  BREVO_API_KEY: z.string(),
  BREVO_WEBHOOK_SECRET: z.string().min(32, "BREVO_WEBHOOK_SECRET doit faire au moins 32 caractères"),
  EMAIL_FROM: z.string().email("EMAIL_FROM doit être une adresse email valide"),

  RGA_ENCRYPTION_KEY: z.string().min(32),
  ADMIN_PASSWORD: z.string().min(8),
  JWT_SECRET: z.string().min(32),
  BASE_URL: z.string().url().default("http://localhost:3000"),

  // Variables FranceConnect
  ...franceConnectEnvSchema.shape,

  // Variables ProConnect
  ...proConnectEnvSchema.shape,
});

// Schéma de validation des variables d'environnement côté client
const clientSchema = z.object({
  NEXT_PUBLIC_MATOMO_SITE_ID: z.string().min(1).optional(),
  NEXT_PUBLIC_MATOMO_URL: z.string().url().optional(),
  NEXT_PUBLIC_CRISP_WEBSITE_ID: z.string().min(1).optional(),
  NEXT_PUBLIC_SENTRY_DSN: z.string().url().optional(),
  NEXT_PUBLIC_SENTRY_ORG: z.string().min(1).optional(),
  NEXT_PUBLIC_SENTRY_PROJECT: z.string().min(1).optional(),
  NEXT_PUBLIC_SENTRY_URL: z.string().url().optional(),
});

// Schéma de validation des variables d'environnement partagées
const sharedSchema = z.object({
  NEXT_PUBLIC_APP_ENV: z.enum(["local", "docker", "staging", "production"]).default("local"),
  NEXT_PUBLIC_DEMARCHES_SIMPLIFIEES_BASE_URL: z.string().min(1),
});

// ==========================================
// Getters avec lazy loading
// ==========================================

// Variables côté serveur (lazy loading)
let _serverEnv: z.infer<typeof serverSchema> | null = null;

export function getServerEnv() {
  if (isClient()) {
    throw new Error("getServerEnv can only be used on server side");
  }

  if (!_serverEnv) {
    const result = serverSchema.safeParse(process.env);
    if (!result.success) {
      console.error("Invalid server environment variables:", result.error.format());
      throw new Error("Invalid server environment variables");
    }
    _serverEnv = result.data;
  }

  return _serverEnv;
}

// Variables côté client (lazy loading)
let _clientEnv: z.infer<typeof clientSchema> | null = null;

export function getClientEnv() {
  if (!_clientEnv) {
    // Construction manuelle de l'objet env car Next.js ne permet pas d'accéder à process.env côté client
    const envObject = {
      NEXT_PUBLIC_MATOMO_SITE_ID: process.env.NEXT_PUBLIC_MATOMO_SITE_ID,
      NEXT_PUBLIC_MATOMO_URL: process.env.NEXT_PUBLIC_MATOMO_URL,
      NEXT_PUBLIC_CRISP_WEBSITE_ID: process.env.NEXT_PUBLIC_CRISP_WEBSITE_ID,
      NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
      NEXT_PUBLIC_SENTRY_ORG: process.env.NEXT_PUBLIC_SENTRY_ORG,
      NEXT_PUBLIC_SENTRY_PROJECT: process.env.NEXT_PUBLIC_SENTRY_PROJECT,
      NEXT_PUBLIC_SENTRY_URL: process.env.NEXT_PUBLIC_SENTRY_URL,
    };

    const result = clientSchema.safeParse(envObject);
    if (!result.success) {
      console.error("Invalid client environment variables:", result.error.format());
      throw new Error("Invalid client environment variables");
    }
    _clientEnv = result.data;
  }

  return _clientEnv;
}

// Variables partagées (lazy loading)
let _sharedEnv: z.infer<typeof sharedSchema> | null = null;

export function getSharedEnv() {
  if (!_sharedEnv) {
    // Côté client : gestion simple et directe
    if (isClient()) {
      const appEnv = process.env.NEXT_PUBLIC_APP_ENV || "local";

      _sharedEnv = {
        NEXT_PUBLIC_APP_ENV: appEnv as "local" | "docker" | "staging" | "production",
        NEXT_PUBLIC_DEMARCHES_SIMPLIFIEES_BASE_URL: process.env.NEXT_PUBLIC_DEMARCHES_SIMPLIFIEES_BASE_URL || "",
      };
      return _sharedEnv;
    }

    // Côté serveur : validation Zod complète
    const result = sharedSchema.safeParse(process.env);
    if (!result.success) {
      console.error("Invalid shared environment variables:", result.error.format());
      throw new Error("Invalid shared environment variables");
    }
    _sharedEnv = result.data;
  }

  return _sharedEnv;
}

// ==========================================
// Helpers d'environnement applicatif
// ==========================================

export const isLocal = () => getSharedEnv().NEXT_PUBLIC_APP_ENV === "local";
export const isStaging = () => getSharedEnv().NEXT_PUBLIC_APP_ENV === "staging";
export const isProduction = () => getSharedEnv().NEXT_PUBLIC_APP_ENV === "production";
export const isDevelopment = () => ["local", "docker"].includes(getSharedEnv().NEXT_PUBLIC_APP_ENV);

// ==========================================
// Validation au démarrage (serveur uniquement)
// ==========================================

if (isServer()) {
  try {
    getSharedEnv();
    getServerEnv();
    console.log("Environment variables validated successfully");
  } catch (error) {
    console.error("Environment validation failed:", error);
    process.exit(1);
  }
}
