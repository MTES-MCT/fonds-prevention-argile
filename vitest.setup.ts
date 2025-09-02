import "@testing-library/jest-dom";
import { vi, afterEach } from "vitest";

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

// Reset des mocks après chaque test
afterEach(() => {
  vi.clearAllMocks();
});
