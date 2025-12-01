import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getSession,
  isAuthenticated,
  hasRole,
  createSessionCookies,
  clearSessionCookies,
  getRoleFromCookies,
  saveRedirectUrl,
  getAndClearRedirectUrl,
  logout,
} from "./session.service";
import { COOKIE_NAMES, ROLES, AUTH_METHODS } from "../domain/value-objects/constants";
import { ROUTES } from "../domain/value-objects/configs/routes.config";
import type { JWTPayload } from "../domain/entities";

// Mock des dépendances
vi.mock("next/headers", () => ({
  cookies: vi.fn(),
}));

vi.mock("../utils/jwt.utils", () => ({
  verifyToken: vi.fn(),
}));

const { cookies } = await import("next/headers");
const { verifyToken } = await import("../utils/jwt.utils");

type MockCookieStore = {
  get: ReturnType<typeof vi.fn>;
  set: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
};

describe("session.service", () => {
  let mockCookieStore: MockCookieStore;

  beforeEach(() => {
    vi.clearAllMocks();

    mockCookieStore = {
      get: vi.fn(),
      set: vi.fn(),
      delete: vi.fn(),
    };

    vi.mocked(cookies).mockResolvedValue(mockCookieStore as unknown as Awaited<ReturnType<typeof cookies>>);
  });

  describe("getSession", () => {
    it("devrait retourner null si aucun token de session", async () => {
      mockCookieStore.get.mockReturnValue(undefined);

      const result = await getSession();

      expect(result).toBeNull();
      expect(mockCookieStore.get).toHaveBeenCalledWith(COOKIE_NAMES.SESSION);
    });

    it("devrait retourner le payload JWT pour une session valide", async () => {
      const mockPayload: JWTPayload = {
        userId: "user-123",
        role: ROLES.ADMINISTRATEUR,
        authMethod: AUTH_METHODS.PROCONNECT,
        exp: Date.now() + 3600000,
        iat: Date.now(),
      };

      mockCookieStore.get.mockReturnValue({ value: "valid-token" });
      vi.mocked(verifyToken).mockReturnValue(mockPayload);

      const result = await getSession();

      expect(result).toEqual(mockPayload);
      expect(verifyToken).toHaveBeenCalledWith("valid-token");
    });

    it("devrait retourner null pour un token invalide", async () => {
      mockCookieStore.get.mockReturnValue({ value: "invalid-token" });
      vi.mocked(verifyToken).mockReturnValue(null);

      const result = await getSession();

      expect(result).toBeNull();
    });
  });

  describe("isAuthenticated", () => {
    it("devrait retourner true si session valide", async () => {
      const mockPayload: JWTPayload = {
        userId: "user-123",
        role: ROLES.PARTICULIER,
        authMethod: AUTH_METHODS.FRANCECONNECT,
        exp: Date.now() + 3600000,
        iat: Date.now(),
      };

      mockCookieStore.get.mockReturnValue({ value: "valid-token" });
      vi.mocked(verifyToken).mockReturnValue(mockPayload);

      const result = await isAuthenticated();

      expect(result).toBe(true);
    });

    it("devrait retourner false si aucune session", async () => {
      mockCookieStore.get.mockReturnValue(undefined);

      const result = await isAuthenticated();

      expect(result).toBe(false);
    });
  });

  describe("hasRole", () => {
    it("devrait retourner true si l'utilisateur a le rôle spécifié", async () => {
      const mockPayload: JWTPayload = {
        userId: "user-123",
        role: ROLES.ADMINISTRATEUR,
        authMethod: AUTH_METHODS.PROCONNECT,
        exp: Date.now() + 3600000,
        iat: Date.now(),
      };

      mockCookieStore.get.mockReturnValue({ value: "valid-token" });
      vi.mocked(verifyToken).mockReturnValue(mockPayload);

      expect(await hasRole(ROLES.ADMINISTRATEUR)).toBe(true);
      expect(await hasRole(ROLES.SUPER_ADMINISTRATEUR)).toBe(false);
      expect(await hasRole(ROLES.PARTICULIER)).toBe(false);
    });

    it("devrait retourner false si aucune session", async () => {
      mockCookieStore.get.mockReturnValue(undefined);

      const result = await hasRole(ROLES.ADMINISTRATEUR);

      expect(result).toBe(false);
    });
  });

  describe("createSessionCookies", () => {
    it("devrait créer des cookies avec durée admin pour ADMIN", async () => {
      const token = "admin-token";

      await createSessionCookies(token, ROLES.ADMINISTRATEUR);

      expect(mockCookieStore.set).toHaveBeenCalledTimes(2);
      expect(mockCookieStore.set).toHaveBeenCalledWith(
        COOKIE_NAMES.SESSION,
        token,
        expect.objectContaining({ maxAge: expect.any(Number) })
      );
      expect(mockCookieStore.set).toHaveBeenCalledWith(
        COOKIE_NAMES.SESSION_ROLE,
        ROLES.ADMINISTRATEUR,
        expect.objectContaining({ maxAge: expect.any(Number) })
      );
    });

    it("devrait créer des cookies avec durée admin pour SUPER_ADMINISTRATEUR", async () => {
      const token = "superadmin-token";

      await createSessionCookies(token, ROLES.SUPER_ADMINISTRATEUR);

      expect(mockCookieStore.set).toHaveBeenCalledWith(
        COOKIE_NAMES.SESSION_ROLE,
        ROLES.SUPER_ADMINISTRATEUR,
        expect.any(Object)
      );
    });

    it("devrait créer des cookies avec durée admin pour AMO", async () => {
      const token = "amo-token";

      await createSessionCookies(token, ROLES.AMO);

      expect(mockCookieStore.set).toHaveBeenCalledWith(COOKIE_NAMES.SESSION_ROLE, ROLES.AMO, expect.any(Object));
    });

    it("devrait créer des cookies avec durée particulier pour PARTICULIER", async () => {
      const token = "particulier-token";

      await createSessionCookies(token, ROLES.PARTICULIER);

      expect(mockCookieStore.set).toHaveBeenCalledWith(
        COOKIE_NAMES.SESSION_ROLE,
        ROLES.PARTICULIER,
        expect.any(Object)
      );
    });
  });

  describe("clearSessionCookies", () => {
    it("devrait supprimer tous les cookies de session", async () => {
      await clearSessionCookies();

      expect(mockCookieStore.delete).toHaveBeenCalledWith(COOKIE_NAMES.SESSION);
      expect(mockCookieStore.delete).toHaveBeenCalledWith(COOKIE_NAMES.SESSION_ROLE);
      expect(mockCookieStore.delete).toHaveBeenCalledWith(COOKIE_NAMES.SESSION_AUTH);
      expect(mockCookieStore.delete).toHaveBeenCalledWith(COOKIE_NAMES.REDIRECT_TO);
      expect(mockCookieStore.delete).toHaveBeenCalledTimes(4);
    });
  });

  describe("getRoleFromCookies", () => {
    it("devrait retourner le rôle depuis les cookies", async () => {
      mockCookieStore.get.mockReturnValue({ value: ROLES.ADMINISTRATEUR });

      const result = await getRoleFromCookies();

      expect(result).toBe(ROLES.ADMINISTRATEUR);
      expect(mockCookieStore.get).toHaveBeenCalledWith(COOKIE_NAMES.SESSION_ROLE);
    });

    it("devrait retourner null si aucun rôle en cookie", async () => {
      mockCookieStore.get.mockReturnValue(undefined);

      const result = await getRoleFromCookies();

      expect(result).toBeNull();
    });
  });

  describe("saveRedirectUrl", () => {
    it("devrait sauvegarder l'URL de redirection pour une route backoffice", async () => {
      const url = `${ROUTES.backoffice.administration.root}/users`;

      await saveRedirectUrl(url);

      expect(mockCookieStore.set).toHaveBeenCalledWith(COOKIE_NAMES.REDIRECT_TO, url, expect.any(Object));
    });

    it("devrait sauvegarder l'URL de redirection pour une route particulier", async () => {
      const url = ROUTES.particulier.monCompte;

      await saveRedirectUrl(url);

      expect(mockCookieStore.set).toHaveBeenCalledWith(COOKIE_NAMES.REDIRECT_TO, url, expect.any(Object));
    });
  });

  describe("getAndClearRedirectUrl", () => {
    it("devrait récupérer et supprimer l'URL de redirection", async () => {
      const redirectUrl = ROUTES.particulier.monCompte;
      mockCookieStore.get.mockReturnValue({ value: redirectUrl });

      const result = await getAndClearRedirectUrl();

      expect(result).toBe(redirectUrl);
      expect(mockCookieStore.get).toHaveBeenCalledWith(COOKIE_NAMES.REDIRECT_TO);
      expect(mockCookieStore.delete).toHaveBeenCalledWith(COOKIE_NAMES.REDIRECT_TO);
    });

    it("devrait retourner null si aucune URL sauvegardée", async () => {
      mockCookieStore.get.mockReturnValue(undefined);

      const result = await getAndClearRedirectUrl();

      expect(result).toBeNull();
      expect(mockCookieStore.delete).not.toHaveBeenCalled();
    });
  });

  describe("logout", () => {
    it("devrait nettoyer les cookies et retourner les infos de session pour ProConnect", async () => {
      const mockPayload: JWTPayload = {
        userId: "agent-123",
        role: ROLES.ADMINISTRATEUR,
        authMethod: AUTH_METHODS.PROCONNECT,
        idToken: "pc-id-token",
        exp: Date.now() + 3600000,
        iat: Date.now(),
      };

      mockCookieStore.get.mockReturnValue({ value: "valid-token" });
      vi.mocked(verifyToken).mockReturnValue(mockPayload);

      const result = await logout();

      expect(result).toEqual({
        authMethod: AUTH_METHODS.PROCONNECT,
        idToken: "pc-id-token",
      });
      expect(mockCookieStore.delete).toHaveBeenCalledTimes(4);
    });

    it("devrait nettoyer les cookies et retourner les infos de session pour FranceConnect", async () => {
      const mockPayload: JWTPayload = {
        userId: "user-123",
        role: ROLES.PARTICULIER,
        authMethod: AUTH_METHODS.FRANCECONNECT,
        idToken: "fc-id-token",
        exp: Date.now() + 3600000,
        iat: Date.now(),
      };

      mockCookieStore.get.mockReturnValue({ value: "valid-token" });
      vi.mocked(verifyToken).mockReturnValue(mockPayload);

      const result = await logout();

      expect(result).toEqual({
        authMethod: AUTH_METHODS.FRANCECONNECT,
        idToken: "fc-id-token",
      });
    });

    it("devrait gérer le cas sans session", async () => {
      mockCookieStore.get.mockReturnValue(undefined);

      const result = await logout();

      expect(result).toEqual({
        authMethod: null,
        idToken: null,
      });
      expect(mockCookieStore.delete).toHaveBeenCalledTimes(4);
    });
  });
});
