import { describe, it, expect, vi, beforeEach } from "vitest";
import { UserRole } from "@/shared/domain/value-objects";

// On contrôle entièrement la couche edge (routing/cookies) ; NextResponse reste réel.
vi.mock("@/features/auth/edge", async () => ({
  // Règle de conformité réelle : c'est elle que ces tests éprouvent.
  estSessionConforme: (
    await vi.importActual<typeof import("@/features/auth/domain/value-objects/session-mfa")>(
      "@/features/auth/domain/value-objects/session-mfa"
    )
  ).estSessionConforme,
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
      espaceAgent: { root: "/espace-agent" },
    },
    connexion: { agent: "/connexion/agent", particulier: "/connexion" },
  },
}));

import { middleware } from "./middleware";
import { decodeToken, isProtectedRoute } from "@/features/auth/edge";

const SESSION_AGENT_MFA = { authMethod: "proconnect", role: UserRole.AMO, proConnectAcr: "eidas1-mfa" };
const SESSION_AGENT_SANS_MFA = { authMethod: "proconnect", role: UserRole.AMO };

function cookiesEffaces(res: Response): string[] {
  return res.headers
    .getSetCookie()
    .filter((cookie) => /Expires=Thu, 01 Jan 1970/i.test(cookie) || /Max-Age=0/i.test(cookie))
    .map((cookie) => cookie.split("=")[0]);
}

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
    vi.mocked(decodeToken).mockReturnValue(SESSION_AGENT_MFA as never);

    const res = await middleware(
      makeRequest("/connexion", {
        session: "tok",
        session_role: UserRole.AMO,
        redirect_to: "/administration",
      })
    );

    expect(res.headers.get("location")).toContain("/espace-agent");
  });

  it("route publique sans session → laisse passer (pas de redirection)", async () => {
    vi.mocked(isProtectedRoute).mockReturnValue(false);

    const res = await middleware(makeRequest("/"));

    expect(res.headers.get("location")).toBeNull();
  });

  describe("sessions antérieures à la double authentification", () => {
    it("sur la page de connexion → effacées, sans redirection (pas de boucle)", async () => {
      vi.mocked(isProtectedRoute).mockReturnValue(false);
      vi.mocked(decodeToken).mockReturnValue(SESSION_AGENT_SANS_MFA as never);

      const res = await middleware(
        makeRequest("/connexion/agent", { session: "tok", session_role: UserRole.AMO, session_auth: "proconnect" })
      );

      expect(res.headers.get("location")).toBeNull();
      expect(cookiesEffaces(res)).toEqual(expect.arrayContaining(["session", "session_role", "session_auth"]));
    });

    it("sur une route agent → renvoyées vers /connexion/agent en mémorisant la page", async () => {
      vi.mocked(isProtectedRoute).mockReturnValue(true);
      vi.mocked(decodeToken).mockReturnValue(SESSION_AGENT_SANS_MFA as never);

      const res = await middleware(
        makeRequest("/espace-agent/dossiers", { session: "tok", session_role: UserRole.AMO })
      );

      expect(res.headers.get("location")).toContain("/connexion/agent");
      expect(cookiesEffaces(res)).toContain("session");
      expect(res.headers.getSetCookie().some((cookie) => cookie.startsWith("redirect_to=%2Fespace-agent"))).toBe(true);
    });

    it("jeton illisible → effacé même si un cookie de rôle subsiste", async () => {
      vi.mocked(isProtectedRoute).mockReturnValue(true);
      vi.mocked(decodeToken).mockReturnValue(null);

      const res = await middleware(
        makeRequest("/administration", { session: "abc", session_role: UserRole.ADMINISTRATEUR })
      );

      expect(res.headers.get("location")).toContain("/connexion/agent");
      expect(cookiesEffaces(res)).toContain("session");
    });

    it("session agent avec preuve MFA → conservée", async () => {
      vi.mocked(isProtectedRoute).mockReturnValue(true);
      vi.mocked(decodeToken).mockReturnValue(SESSION_AGENT_MFA as never);

      const res = await middleware(
        makeRequest("/espace-agent/dossiers", { session: "tok", session_role: UserRole.AMO })
      );

      expect(res.headers.get("location")).toBeNull();
      expect(cookiesEffaces(res)).toEqual([]);
    });

    it("session demandeur FranceConnect → conservée, hors périmètre de la 2FA", async () => {
      vi.mocked(isProtectedRoute).mockReturnValue(true);
      vi.mocked(decodeToken).mockReturnValue({ authMethod: "franceconnect", role: UserRole.PARTICULIER } as never);

      const res = await middleware(makeRequest("/mon-compte", { session: "tok", session_role: UserRole.PARTICULIER }));

      expect(res.headers.get("location")).toBeNull();
      expect(cookiesEffaces(res)).toEqual([]);
    });
  });
});
