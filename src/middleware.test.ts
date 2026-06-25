import { describe, it, expect, vi, beforeEach } from "vitest";
import { UserRole } from "@/shared/domain/value-objects";

// On contrôle entièrement la couche edge (routing/cookies) ; NextResponse reste réel.
vi.mock("@/features/auth/edge", () => ({
  COOKIE_NAMES: {
    SESSION: "session",
    SESSION_ROLE: "session_role",
    SESSION_AUTH: "session_auth",
    REDIRECT_TO: "redirect_to",
  },
  PUBLIC_ROUTES: { franceConnectApi: [], proConnectApi: [], auth: ["/connexion"] },
  DEFAULT_REDIRECTS: { login: "/connexion" },
  SESSION_DURATION: { redirectCookie: 600 },
  getCookieOptions: () => ({}),
  decodeToken: vi.fn(),
  isValidRole: vi.fn(() => true),
  isProtectedRoute: vi.fn(),
  getDefaultRedirect: vi.fn(() => "/mon-compte"),
  ROUTES: {
    backoffice: {
      administration: { root: "/administration" },
      espaceAmo: { root: "/espace-amo" },
      espaceAgent: { root: "/espace-agent" },
    },
    connexion: { agent: "/connexion/agent", particulier: "/connexion" },
  },
}));

import { middleware } from "./middleware";
import { isProtectedRoute } from "@/features/auth/edge";

// Construit un NextRequest minimal (pathname, cookies, url) suffisant pour le middleware.
function makeRequest(path: string, cookies: Record<string, string> = {}) {
  return {
    nextUrl: { pathname: path },
    url: `https://app.test${path}`,
    cookies: {
      get: (name: string) => (cookies[name] !== undefined ? { value: cookies[name] } : undefined),
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

describe("middleware — authentification & redirection (§7)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("route backoffice protégée sans session → redirige vers /connexion/agent", async () => {
    vi.mocked(isProtectedRoute).mockReturnValue(true);

    const res = await middleware(makeRequest("/administration/agents"));

    expect(res.headers.get("location")).toContain("/connexion/agent");
  });

  it("route particulier protégée sans session → redirige vers /connexion", async () => {
    vi.mocked(isProtectedRoute).mockReturnValue(true);

    const res = await middleware(makeRequest("/mon-compte"));

    const location = res.headers.get("location") ?? "";
    expect(location).toContain("/connexion");
    expect(location).not.toContain("/connexion/agent");
  });

  it("AMO authentifié avec redirectTo=/administration → renvoyé vers /espace-amo (pas l'admin)", async () => {
    vi.mocked(isProtectedRoute).mockReturnValue(false);

    const res = await middleware(
      makeRequest("/connexion", {
        session: "tok",
        session_role: UserRole.AMO,
        redirect_to: "/administration",
      })
    );

    expect(res.headers.get("location")).toContain("/espace-amo");
  });

  it("route publique sans session → laisse passer (pas de redirection)", async () => {
    vi.mocked(isProtectedRoute).mockReturnValue(false);

    const res = await middleware(makeRequest("/"));

    expect(res.headers.get("location")).toBeNull();
  });
});
