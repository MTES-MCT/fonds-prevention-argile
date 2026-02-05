import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getDemandeDetailAction,
  accepterAccompagnement,
  refuserDemandeNonEligible,
  refuserDemandeAccompagnement,
} from "./demande-detail.actions";
import { getDemandeDetail } from "../services/demande-detail.service";
import {
  approveValidation,
  rejectEligibility,
  rejectAccompagnement,
} from "@/features/parcours/amo/services/amo-validation.service";
import { getCurrentUser } from "@/features/auth/services/user.service";
import { UserRole } from "@/shared/domain/value-objects";
import { Step } from "@/shared/domain/value-objects/step.enum";
import { db } from "@/shared/database/client";

// Mock des modules
vi.mock("../services/demande-detail.service");
vi.mock("@/features/parcours/amo/services/amo-validation.service");
vi.mock("@/features/auth/services/user.service");
vi.mock("@/shared/database/client", () => ({
  db: {
    select: vi.fn(),
  },
}));

// Mock de l'environnement serveur
vi.mock("@/shared/config/env.config", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/shared/config/env.config")>();
  return {
    ...actual,
    getServerEnv: vi.fn(() => ({
      DATABASE_URL: "mock-db-url",
      DEMARCHES_SIMPLIFIEES_API_TOKEN: "mock-token",
      DEMARCHES_SIMPLIFIEES_GRAPHQL_API_KEY: "mock-graphql-key",
      DEMARCHES_SIMPLIFIEES_REST_API_URL: "https://mock-ds-api.com/api/public/v1",
    })),
    isClient: vi.fn(() => false),
  };
});

// Mock Démarches Simplifiées
vi.mock("@/features/parcours/dossiers-ds/adapters/graphql", () => ({
  demarchesSimplifieesClient: {
    query: vi.fn(),
  },
}));

describe("demande-detail.actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getDemandeDetailAction", () => {
    it("devrait récupérer les détails d'une demande", async () => {
      const mockDemande = {
        id: "demande-123",
        demandeur: {
          prenom: "Jean",
          nom: "Dupont",
          email: "jean.dupont@example.com",
          telephone: "0123456789",
          adresse: "1 rue de la Paix",
        },
        logement: {
          anneeConstruction: "2000",
          nombreNiveaux: "2",
          etatMaison: "saine",
          zoneExposition: "moyen" as const,
          indemnisationPasseeRGA: false,
          indemnisationAvantJuillet2025: null,
          indemnisationAvantJuillet2015: null,
          montantIndemnisation: null,
          nombreHabitants: 4,
          niveauRevenu: "Modeste",
          codeInsee: "75001",
          lat: 48.8566,
          lon: 2.3522,
          rnbId: "RNB123456",
        },
        statut: "EN_ATTENTE",
        dateCreation: new Date(),
        commentaire: null,
        currentStep: Step.CHOIX_AMO,
        parcoursCreatedAt: new Date(),
        dates: {
          compteCreatedAt: new Date(),
          amoChoisieAt: new Date(),
          eligibiliteSubmittedAt: undefined,
          diagnosticSubmittedAt: undefined,
          devisSubmittedAt: undefined,
          facturesSubmittedAt: undefined,
        },
      };

      vi.mocked(getDemandeDetail).mockResolvedValue({
        success: true,
        data: mockDemande,
      });

      const result = await getDemandeDetailAction("demande-123");

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(mockDemande);
      }
      expect(getDemandeDetail).toHaveBeenCalledWith("demande-123");
    });

    it("devrait retourner une erreur si la récupération échoue", async () => {
      vi.mocked(getDemandeDetail).mockResolvedValue({
        success: false,
        error: "Demande non trouvée",
      });

      const result = await getDemandeDetailAction("demande-123");

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Demande non trouvée");
      }
    });
  });

  describe("accepterAccompagnement", () => {
    it("devrait accepter l'accompagnement pour un AMO propriétaire", async () => {
      vi.mocked(getCurrentUser).mockResolvedValue({
        id: "user-123",
        role: UserRole.AMO,
        entrepriseAmoId: "amo-123",
        email: "amo@example.com",
        authMethod: "proconnect",
        loginTime: new Date().toISOString(),
        firstName: "Test",
        lastName: "AMO",
      });

      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ entrepriseAmoId: "amo-123" }]),
          }),
        }),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      vi.mocked(approveValidation).mockResolvedValue({
        success: true,
        data: { message: "Validation acceptée" },
      });

      const result = await accepterAccompagnement("demande-123", "Commentaire test");

      expect(result.success).toBe(true);
      if (result.success) {
        expect(approveValidation).toHaveBeenCalledWith("demande-123", "Commentaire test");
      }
    });

    it("devrait refuser l'accès si l'utilisateur n'est pas connecté", async () => {
      vi.mocked(getCurrentUser).mockResolvedValue(null);

      const result = await accepterAccompagnement("demande-123");

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Non authentifié");
      }
    });
  });

  describe("refuserDemandeNonEligible", () => {
    it("devrait refuser une demande pour non éligibilité avec un commentaire valide", async () => {
      vi.mocked(getCurrentUser).mockResolvedValue({
        id: "user-123",
        role: UserRole.AMO,
        entrepriseAmoId: "amo-123",
        email: "amo@example.com",
        authMethod: "proconnect",
        loginTime: new Date().toISOString(),
        firstName: "Test",
        lastName: "AMO",
      });

      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ entrepriseAmoId: "amo-123" }]),
          }),
        }),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      vi.mocked(rejectEligibility).mockResolvedValue({
        success: true,
        data: { message: "Demande refusée" },
      });

      const result = await refuserDemandeNonEligible(
        "demande-123",
        "Le logement n'est pas dans une zone RGA"
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(rejectEligibility).toHaveBeenCalledWith(
          "demande-123",
          "Le logement n'est pas dans une zone RGA"
        );
      }
    });

    it("devrait retourner une erreur si le commentaire est trop court", async () => {
      vi.mocked(getCurrentUser).mockResolvedValue({
        id: "user-123",
        role: UserRole.AMO,
        entrepriseAmoId: "amo-123",
        email: "amo@example.com",
        authMethod: "proconnect",
        loginTime: new Date().toISOString(),
        firstName: "Test",
        lastName: "AMO",
      });

      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ entrepriseAmoId: "amo-123" }]),
          }),
        }),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      const result = await refuserDemandeNonEligible("demande-123", "Court");

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("minimum 10 caractères");
      }
    });
  });

  describe("refuserDemandeAccompagnement", () => {
    it("devrait refuser l'accompagnement", async () => {
      vi.mocked(getCurrentUser).mockResolvedValue({
        id: "user-123",
        role: UserRole.ADMINISTRATEUR,
        email: "admin@example.com",
        authMethod: "proconnect",
        loginTime: new Date().toISOString(),
        firstName: "Test",
        lastName: "Admin",
      });

      vi.mocked(rejectAccompagnement).mockResolvedValue({
        success: true,
        data: { message: "Accompagnement refusé" },
      });

      const result = await refuserDemandeAccompagnement("demande-123", "Accompagnement refusé");

      expect(result.success).toBe(true);
      if (result.success) {
        expect(rejectAccompagnement).toHaveBeenCalledWith("demande-123", "Accompagnement refusé");
      }
    });
  });
});
