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
 * Fonction pour créer le mock complet de env.config
 */
export const createEnvConfigMock = () => ({
  getServerEnv: vi.fn(() => mockServerEnv),
  isClient: vi.fn(() => false),
  isServer: vi.fn(() => true),
  isProduction: vi.fn(() => false),
});
