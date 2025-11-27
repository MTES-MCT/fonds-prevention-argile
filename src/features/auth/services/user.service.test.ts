import { describe, it, expect, vi, beforeEach } from "vitest";
import { getCurrentUser } from "./user.service";
import { AUTH_METHODS, ROLES } from "../domain/value-objects/constants";
import type { JWTPayload } from "../domain/entities";

// Mock de getSession
vi.mock("./session.service", () => ({
  getSession: vi.fn(),
}));

const { getSession } = await import("./session.service");

describe("user.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getCurrentUser", () => {
    it("devrait retourner null si aucune session", async () => {
      vi.mocked(getSession).mockResolvedValue(null);

      const result = await getCurrentUser();

      expect(result).toBeNull();
    });

    describe("Admin avec mot de passe (legacy)", () => {
      it("devrait retourner les infos admin par défaut", async () => {
        const mockSession: JWTPayload = {
          userId: "admin-123",
          role: ROLES.ADMINISTRATEUR,
          authMethod: AUTH_METHODS.PASSWORD,
          exp: Date.now() + 3600000,
          iat: Date.now(),
        };

        vi.mocked(getSession).mockResolvedValue(mockSession);

        const result = await getCurrentUser();

        expect(result).toMatchObject({
          id: "admin-123",
          role: ROLES.ADMINISTRATEUR,
          authMethod: AUTH_METHODS.PASSWORD,
          firstName: "Administrateur",
        });
        expect(result?.loginTime).toBeDefined();
      });
    });

    describe("Agents ProConnect", () => {
      it("devrait retourner les infos pour ADMIN ProConnect", async () => {
        const mockSession: JWTPayload = {
          userId: "agent-123",
          role: ROLES.ADMINISTRATEUR,
          authMethod: AUTH_METHODS.PROCONNECT,
          firstName: "Jean",
          lastName: "Dupont",
          exp: Date.now() + 3600000,
          iat: Date.now(),
        };

        vi.mocked(getSession).mockResolvedValue(mockSession);

        const result = await getCurrentUser();

        expect(result).toMatchObject({
          id: "agent-123",
          role: ROLES.ADMINISTRATEUR,
          authMethod: AUTH_METHODS.PROCONNECT,
          firstName: "Jean",
          lastName: "Dupont",
        });
        expect(result?.loginTime).toBeDefined();
      });

      it("devrait retourner les infos pour SUPER_ADMINISTRATEUR ProConnect", async () => {
        const mockSession: JWTPayload = {
          userId: "superadmin-456",
          role: ROLES.SUPER_ADMINISTRATEUR,
          authMethod: AUTH_METHODS.PROCONNECT,
          firstName: "Marie",
          lastName: "Martin",
          exp: Date.now() + 3600000,
          iat: Date.now(),
        };

        vi.mocked(getSession).mockResolvedValue(mockSession);

        const result = await getCurrentUser();

        expect(result).toMatchObject({
          id: "superadmin-456",
          role: ROLES.SUPER_ADMINISTRATEUR,
          authMethod: AUTH_METHODS.PROCONNECT,
          firstName: "Marie",
          lastName: "Martin",
        });
      });

      it("devrait retourner les infos pour AMO ProConnect", async () => {
        const mockSession: JWTPayload = {
          userId: "amo-789",
          role: ROLES.AMO,
          authMethod: AUTH_METHODS.PROCONNECT,
          firstName: "Pierre",
          lastName: "Bernard",
          exp: Date.now() + 3600000,
          iat: Date.now(),
        };

        vi.mocked(getSession).mockResolvedValue(mockSession);

        const result = await getCurrentUser();

        expect(result).toMatchObject({
          id: "amo-789",
          role: ROLES.AMO,
          authMethod: AUTH_METHODS.PROCONNECT,
          firstName: "Pierre",
          lastName: "Bernard",
        });
      });
    });

    describe("Particuliers FranceConnect", () => {
      it("devrait retourner les infos pour PARTICULIER FranceConnect", async () => {
        const mockSession: JWTPayload = {
          userId: "user-123",
          role: ROLES.PARTICULIER,
          authMethod: AUTH_METHODS.FRANCECONNECT,
          firstName: "Sophie",
          lastName: "Lefebvre",
          exp: Date.now() + 3600000,
          iat: Date.now(),
        };

        vi.mocked(getSession).mockResolvedValue(mockSession);

        const result = await getCurrentUser();

        expect(result).toMatchObject({
          id: "user-123",
          role: ROLES.PARTICULIER,
          authMethod: AUTH_METHODS.FRANCECONNECT,
          firstName: "Sophie",
          lastName: "Lefebvre",
        });
        expect(result?.loginTime).toBeDefined();
      });

      it("devrait gérer un particulier sans nom/prénom", async () => {
        const mockSession: JWTPayload = {
          userId: "user-456",
          role: ROLES.PARTICULIER,
          authMethod: AUTH_METHODS.FRANCECONNECT,
          exp: Date.now() + 3600000,
          iat: Date.now(),
        };

        vi.mocked(getSession).mockResolvedValue(mockSession);

        const result = await getCurrentUser();

        expect(result).toMatchObject({
          id: "user-456",
          role: ROLES.PARTICULIER,
          authMethod: AUTH_METHODS.FRANCECONNECT,
        });
        expect(result?.firstName).toBeUndefined();
        expect(result?.lastName).toBeUndefined();
      });
    });

    describe("Cas fallback", () => {
      it("devrait gérer une méthode d'auth inconnue", async () => {
        const mockSession: JWTPayload = {
          userId: "user-999",
          role: ROLES.PARTICULIER,
          authMethod: "UNKNOWN_METHOD",

          exp: Date.now() + 3600000,
          iat: Date.now(),
        };

        vi.mocked(getSession).mockResolvedValue(mockSession);

        const result = await getCurrentUser();

        expect(result).toMatchObject({
          id: "user-999",
          role: ROLES.PARTICULIER,
          authMethod: "UNKNOWN_METHOD",
        });
        expect(result?.loginTime).toBeDefined();
      });
    });
  });
});
