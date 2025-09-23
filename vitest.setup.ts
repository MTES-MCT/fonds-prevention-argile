import "@testing-library/jest-dom";
import { vi, afterEach } from "vitest";

// Mock global de fetch
global.fetch = vi.fn();

// Mock de Next.js navigation (presque toujours nécessaire)
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    refresh: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: vi.fn(() => "/"),
  useParams: () => ({}),
}));

// Mock de env.config
vi.mock("@/lib/config/env.config", () => ({
  getServerEnv: vi.fn(() => ({
    DEMARCHES_SIMPLIFIEES_REST_API_URL: "https://api.test.fr/api/public/v1",
    DEMARCHES_SIMPLIFIEES_GRAPHQL_API_URL: "https://api.test.fr/api/v2/graphql",
    DEMARCHES_SIMPLIFIEES_GRAPHQL_API_KEY: "test-api-key",
    DEMARCHES_SIMPLIFIEES_ID_ELIGIBILITE: "test-id-eligibilite",
    DEMARCHES_SIMPLIFIEES_NOM_ELIGIBILITE: "test-nom-eligibilite",
    DEMARCHES_SIMPLIFIEES_ID_DIAGNOSTIC: "test-id-diagnostic",
    DEMARCHES_SIMPLIFIEES_NOM_DIAGNOSTIC: "test-nom-diagnostic",
    DEMARCHES_SIMPLIFIEES_ID_DEVIS: "test-id-devis",
    DEMARCHES_SIMPLIFIEES_NOM_DEVIS: "test-nom-devis",
    DEMARCHES_SIMPLIFIEES_ID_FACTURES: "test-id-factures",
    DEMARCHES_SIMPLIFIEES_NOM_FACTURES: "test-nom-factures",
  })),
  isClient: vi.fn(() => false),
}));

// Reset des mocks après chaque test
afterEach(() => {
  vi.clearAllMocks();
});
