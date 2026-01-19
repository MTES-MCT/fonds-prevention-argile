import { describe, it, expect, vi, beforeEach } from "vitest";
import { getCurrentUser } from "./user.service";
import { AUTH_METHODS, ROLES } from "../domain/value-objects/constants";
import type { JWTPayload } from "../domain/entities";

// Mock de getSession
vi.mock("./session.service", () => ({
  getSession: vi.fn(),
}));

// Mock du repository agents
vi.mock("@/shared/database", () => ({
  agentsRepo: {
    findBySub: vi.fn(),
  },
}));

const { getSession } = await import("./session.service");
const { agentsRepo } = await import("@/shared/database");

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
        // Pas d'appel au repository pour le mode password
        expect(agentsRepo.findBySub).not.toHaveBeenCalled();
      });
    });

    describe("Agents ProConnect", () => {
      it("devrait retourner les infos pour ADMIN ProConnect avec agentId", async () => {
        const mockSession: JWTPayload = {
          userId: "sub-agent-123",
          role: ROLES.ADMINISTRATEUR,
          authMethod: AUTH_METHODS.PROCONNECT,
          firstName: "Jean",
          lastName: "Dupont",
          exp: Date.now() + 3600000,
          iat: Date.now(),
        };

        vi.mocked(getSession).mockResolvedValue(mockSession);
        vi.mocked(agentsRepo.findBySub).mockResolvedValue({
          id: "agent-db-id-123",
          sub: "sub-agent-123",
          email: "jean.dupont@gouv.fr",
          givenName: "Jean",
          usualName: "Dupont",
          role: ROLES.ADMINISTRATEUR,
          entrepriseAmoId: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          uid: null,
          siret: null,
          phone: null,
          organizationalUnit: null,
        });

        const result = await getCurrentUser();

        expect(result).toMatchObject({
          id: "sub-agent-123",
          role: ROLES.ADMINISTRATEUR,
          authMethod: AUTH_METHODS.PROCONNECT,
          firstName: "Jean",
          lastName: "Dupont",
          agentId: "agent-db-id-123",
        });
        expect(result?.entrepriseAmoId).toBeUndefined();
        expect(result?.loginTime).toBeDefined();
        expect(agentsRepo.findBySub).toHaveBeenCalledWith("sub-agent-123");
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
        vi.mocked(agentsRepo.findBySub).mockResolvedValue({
          id: "agent-db-id-456",
          sub: "superadmin-456",
          email: "marie.martin@gouv.fr",
          givenName: "Marie",
          usualName: "Martin",
          role: ROLES.SUPER_ADMINISTRATEUR,
          entrepriseAmoId: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          uid: null,
          siret: null,
          phone: null,
          organizationalUnit: null,
        });

        const result = await getCurrentUser();

        expect(result).toMatchObject({
          id: "superadmin-456",
          role: ROLES.SUPER_ADMINISTRATEUR,
          authMethod: AUTH_METHODS.PROCONNECT,
          firstName: "Marie",
          lastName: "Martin",
          agentId: "agent-db-id-456",
        });
      });

      it("devrait retourner les infos pour AMO ProConnect avec entrepriseAmoId", async () => {
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
        vi.mocked(agentsRepo.findBySub).mockResolvedValue({
          id: "agent-db-id-789",
          sub: "amo-789",
          email: "pierre.bernard@amo.fr",
          givenName: "Pierre",
          usualName: "Bernard",
          role: ROLES.AMO,
          entrepriseAmoId: "entreprise-amo-123",
          createdAt: new Date(),
          updatedAt: new Date(),
          uid: null,
          siret: null,
          phone: null,
          organizationalUnit: null,
        });

        const result = await getCurrentUser();

        expect(result).toMatchObject({
          id: "amo-789",
          role: ROLES.AMO,
          authMethod: AUTH_METHODS.PROCONNECT,
          firstName: "Pierre",
          lastName: "Bernard",
          agentId: "agent-db-id-789",
          entrepriseAmoId: "entreprise-amo-123",
        });
      });

      it("devrait gérer un AMO sans entreprise rattachée", async () => {
        const mockSession: JWTPayload = {
          userId: "amo-no-entreprise",
          role: ROLES.AMO,
          authMethod: AUTH_METHODS.PROCONNECT,
          firstName: "Lucas",
          lastName: "Petit",
          exp: Date.now() + 3600000,
          iat: Date.now(),
        };

        vi.mocked(getSession).mockResolvedValue(mockSession);
        vi.mocked(agentsRepo.findBySub).mockResolvedValue({
          id: "agent-db-id-no-amo",
          sub: "amo-no-entreprise",
          email: "lucas.petit@amo.fr",
          givenName: "Lucas",
          usualName: "Petit",
          role: ROLES.AMO,
          entrepriseAmoId: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          uid: null,
          siret: null,
          phone: null,
          organizationalUnit: null,
        });

        const result = await getCurrentUser();

        expect(result).toMatchObject({
          id: "amo-no-entreprise",
          role: ROLES.AMO,
          authMethod: AUTH_METHODS.PROCONNECT,
          agentId: "agent-db-id-no-amo",
        });
        expect(result?.entrepriseAmoId).toBeUndefined();
      });

      it("devrait gérer un agent non trouvé en BDD", async () => {
        const mockSession: JWTPayload = {
          userId: "agent-not-found",
          role: ROLES.ADMINISTRATEUR,
          authMethod: AUTH_METHODS.PROCONNECT,
          firstName: "Inconnu",
          lastName: "Agent",
          exp: Date.now() + 3600000,
          iat: Date.now(),
        };

        vi.mocked(getSession).mockResolvedValue(mockSession);
        vi.mocked(agentsRepo.findBySub).mockResolvedValue(null);

        const result = await getCurrentUser();

        expect(result).toMatchObject({
          id: "agent-not-found",
          role: ROLES.ADMINISTRATEUR,
          authMethod: AUTH_METHODS.PROCONNECT,
          firstName: "Inconnu",
          lastName: "Agent",
        });
        expect(result?.agentId).toBeUndefined();
        expect(result?.entrepriseAmoId).toBeUndefined();
      });

      it("devrait retourner les infos pour ANALYSTE ProConnect", async () => {
        const mockSession: JWTPayload = {
          userId: "analyste-123",
          role: ROLES.ANALYSTE,
          authMethod: AUTH_METHODS.PROCONNECT,
          firstName: "Claire",
          lastName: "Durand",
          exp: Date.now() + 3600000,
          iat: Date.now(),
        };

        vi.mocked(getSession).mockResolvedValue(mockSession);
        vi.mocked(agentsRepo.findBySub).mockResolvedValue({
          id: "agent-db-analyste",
          sub: "analyste-123",
          email: "claire.durand@gouv.fr",
          givenName: "Claire",
          usualName: "Durand",
          role: ROLES.ANALYSTE,
          entrepriseAmoId: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          uid: null,
          siret: null,
          phone: null,
          organizationalUnit: null,
        });

        const result = await getCurrentUser();

        expect(result).toMatchObject({
          id: "analyste-123",
          role: ROLES.ANALYSTE,
          authMethod: AUTH_METHODS.PROCONNECT,
          firstName: "Claire",
          lastName: "Durand",
          agentId: "agent-db-analyste",
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
        // Pas d'appel au repository pour FranceConnect
        expect(agentsRepo.findBySub).not.toHaveBeenCalled();
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
