import { vi } from "vitest";

/**
 * Configuration d'environnement de test standard
 */
export const mockServerEnv = {
  DATABASE_URL: "postgresql://test",
  DEMARCHES_SIMPLIFIEES_API_URL: "https://test.api.com",
  DEMARCHES_SIMPLIFIEES_API_TOKEN: "test-token",
  DEMARCHES_SIMPLIFIEES_REST_API_URL: "https://test.rest.api.com",
  NEXTAUTH_SECRET: "test-secret",
};

/**
 * Variables partagées client/serveur. Les listes départementales restent indéfinies :
 * les tests héritent alors des valeurs par défaut du code, jamais de celles d'un `.env`.
 */
export const mockSharedEnv = {
  NEXT_PUBLIC_APP_ENV: "local" as const,
  NEXT_PUBLIC_DEMARCHES_SIMPLIFIEES_BASE_URL: "https://test.ds.com",
  NEXT_PUBLIC_DEPARTEMENTS_AMO_OBLIGATOIRE: undefined,
  NEXT_PUBLIC_DEPARTEMENTS_AV_AMO_FUSIONNES: undefined,
};

/**
 * Fonction pour créer le mock complet de env.config
 */
export const createEnvConfigMock = () => ({
  getServerEnv: vi.fn(() => mockServerEnv),
  getSharedEnv: vi.fn(() => mockSharedEnv),
  isClient: vi.fn(() => false),
  isServer: vi.fn(() => true),
  isProduction: vi.fn(() => false),
});
