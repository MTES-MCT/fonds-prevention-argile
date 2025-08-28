import { z } from "zod";
import { isClient, isServer } from "@/lib/utils/env";

// Schémas de validation
const serverSchema = z.object({
  NEXT_TELEMETRY_DISABLED: z.string().optional(),
});

const clientSchema = z.object({
  NEXT_PUBLIC_MATOMO_SITE_ID: z.string().min(1).optional(),
  NEXT_PUBLIC_MATOMO_URL: z.string().url().optional(),
  NEXT_PUBLIC_SENTRY_DSN: z.string().url().optional(),
  NEXT_PUBLIC_SENTRY_ORG: z.string().min(1).optional(),
  NEXT_PUBLIC_SENTRY_PROJECT: z.string().min(1).optional(),
  NEXT_PUBLIC_SENTRY_URL: z.string().url().optional(),
});

const sharedSchema = z.object({
  NEXT_PUBLIC_APP_ENV: z
    .enum(["local", "docker", "staging", "production"])
    .default("local"),
});

// Variables côté serveur (lazy loading)
let _serverEnv: z.infer<typeof serverSchema> | null = null;

export function getServerEnv() {
  if (isClient()) {
    throw new Error("getServerEnv can only be used on server side");
  }

  if (!_serverEnv) {
    const result = serverSchema.safeParse(process.env);
    if (!result.success) {
      console.error(
        "Invalid server environment variables:",
        result.error.format()
      );
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
      NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
      NEXT_PUBLIC_SENTRY_ORG: process.env.NEXT_PUBLIC_SENTRY_ORG,
      NEXT_PUBLIC_SENTRY_PROJECT: process.env.NEXT_PUBLIC_SENTRY_PROJECT,
      NEXT_PUBLIC_SENTRY_URL: process.env.NEXT_PUBLIC_SENTRY_URL,
    };

    const result = clientSchema.safeParse(envObject);
    if (!result.success) {
      console.error(
        "Invalid client environment variables:",
        result.error.format()
      );
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
        NEXT_PUBLIC_APP_ENV: appEnv as
          | "local"
          | "docker"
          | "staging"
          | "production",
      };
      return _sharedEnv;
    }

    // Côté serveur : validation Zod complète
    const result = sharedSchema.safeParse(process.env);
    if (!result.success) {
      console.error(
        "Invalid shared environment variables:",
        result.error.format()
      );
      throw new Error("Invalid shared environment variables");
    }
    _sharedEnv = result.data;
  }

  return _sharedEnv;
}

// Export des constantes pour compatibilité
export const ENV_SERVER = new Proxy({} as z.infer<typeof serverSchema>, {
  get(_, prop) {
    return getServerEnv()[prop as keyof z.infer<typeof serverSchema>];
  },
});

export const ENV_CLIENT = new Proxy({} as z.infer<typeof clientSchema>, {
  get(_, prop) {
    return getClientEnv()[prop as keyof z.infer<typeof clientSchema>];
  },
});

export const ENV_SHARED = new Proxy({} as z.infer<typeof sharedSchema>, {
  get(_, prop) {
    return getSharedEnv()[prop as keyof z.infer<typeof sharedSchema>];
  },
});

// Validation au démarrage (côté serveur uniquement)
if (isServer()) {
  try {
    getSharedEnv();
    getServerEnv();
    console.log("Environment variables validated successfully");
  } catch (error) {
    console.error("Environment validation failed:", error);
    process.exit(1);
  }
} else {
  // Côté client : validation différée lors du premier appel
  console.log("Client side: environment validation will be done on first use");
}

// Helpers pour vérifier l'environnement
export const isLocal = () => getSharedEnv().NEXT_PUBLIC_APP_ENV === "local";
export const isStaging = () => getSharedEnv().NEXT_PUBLIC_APP_ENV === "staging";
export const isProduction = () =>
  getSharedEnv().NEXT_PUBLIC_APP_ENV === "production";
export const isDevelopment = () =>
  ["local", "docker"].includes(getSharedEnv().NEXT_PUBLIC_APP_ENV);
