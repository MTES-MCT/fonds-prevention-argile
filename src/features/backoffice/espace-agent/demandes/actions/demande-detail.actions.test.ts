import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getDemandeDetailAction,
  accepterAccompagnement,
  refuserDemandeNonEligible,
  refuserAccompagnementEligible,
} from "./demande-detail.actions";
import { getDemandeDetail } from "../services/demande-detail.service";
import {
  approveValidation,
  rejectEligibility,
  declineAccompagnementEligible,
} from "@/features/parcours/amo/services/amo-validation.service";
import { getCurrentUser } from "@/features/auth/services/user.service";
import { getCurrentAgent } from "@/features/backoffice/shared/actions/agent.actions";
import { assertNotSuperAdminReadOnly } from "@/features/backoffice/shared/actions/super-admin-access";
import { UserRole } from "@/shared/domain/value-objects";
import { Step } from "@/shared/domain/value-objects/step.enum";
import { db } from "@/shared/database/client";
import type { AuthUser } from "@/features/auth/domain/entities";
import type { Agent } from "@/shared/database/schema/agents";

// Mock des modules
vi.mock("../services/demande-detail.service");
vi.mock("@/features/parcours/amo/services/amo-validation.service");
vi.mock("@/features/auth/services/user.service");
vi.mock("@/features/backoffice/shared/actions/agent.actions");
// L'audit parcours_actions est best-effort : on neutralise ses dépendances DB.
vi.mock("@/shared/database/repositories", () => ({
  parcoursActionsRepo: { create: vi.fn() },
}));
vi.mock("@/features/backoffice/espace-agent/shared/services/author-snapshot", () => ({
  buildAuthorSnapshot: vi.fn().mockResolvedValue({
    authorName: "Test Agent",
    authorStructure: "Entreprise Test",
    authorStructureType: "AMO",
  }),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/features/backoffice/shared/actions/super-admin-access", () => ({
  assertNotSuperAdminReadOnly: vi.fn(),
}));
vi.mock("@/shared/database/client", () => ({
  db: {
    select: vi.fn(),
  },
}));

// Helper : construit un AuthUser agent ProConnect minimal
const makeAgent = (role: UserRole, entrepriseAmoId?: string | null): AuthUser => ({
  id: "user-123",
  role,
  entrepriseAmoId: entrepriseAmoId ?? undefined,
  email: "agent@example.com",
  authMethod: "proconnect",
  loginTime: new Date().toISOString(),
  firstName: "Test",
  lastName: "Agent",
});

// Mock de la requête db retournant l'entrepriseAmoId propriétaire de la demande
const mockDemandeOwner = (entrepriseAmoId: string | null) => {
  vi.mocked(db.select).mockReturnValue({
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue([{ entrepriseAmoId }]),
      }),
    }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);
};

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
    // Par défaut : pas en lecture seule (agent normal)
    vi.mocked(assertNotSuperAdminReadOnly).mockResolvedValue(null);
  });

  describe("getDemandeDetailAction", () => {
    it("devrait récupérer les détails d'une demande", async () => {
      const mockDemande = {
        id: "demande-123",
        parcoursId: "parcours-123",
        demandeur: {
          prenom: "Jean",
          nom: "Dupont",
          nomFamille: "Dupont",
          email: "jean.dupont@example.com",
          telephone: "0123456789",
          adresse: "1 rue de la Paix",
          sourceAcquisition: null,
          sourceAcquisitionPrecision: null,
        },
        logement: {
          typeLogement: "maison" as const,
          anneeConstruction: "2000",
          nombreNiveaux: "2",
          mitoyen: false,
          assure: true,
          proprietaireOccupant: true,
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
        archivedAt: null,
        dateCreation: new Date(),
        commentaire: null,
        estMandataireFinancier: null,
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
        creator: null,
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
        data: {
          message: "Validation acceptée",
          alreadyProcessed: false,
          valideeAt: new Date(),
          parcoursId: "parcours-123",
        },
      });

      const result = await accepterAccompagnement("demande-123", "Commentaire test", true);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(approveValidation).toHaveBeenCalledWith("demande-123", "Commentaire test", true);
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
        data: {
          message: "Demande refusée",
          alreadyProcessed: false,
          valideeAt: new Date(),
          parcoursId: "parcours-123",
        },
      });

      const result = await refuserDemandeNonEligible("demande-123", "Le logement n'est pas dans une zone RGA");

      expect(result.success).toBe(true);
      if (result.success) {
        expect(rejectEligibility).toHaveBeenCalledWith("demande-123", "Le logement n'est pas dans une zone RGA");
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

  describe("refuserAccompagnementEligible", () => {
    // Agent minimal : seul `id` est lu par l'action (archivedBy).
    const mockAgent = (id = "agent-1") =>
      vi.mocked(getCurrentAgent).mockResolvedValue({ success: true, data: { id } as unknown as Agent });

    it("archive et refuse l'accompagnement pour un AMO propriétaire", async () => {
      vi.mocked(getCurrentUser).mockResolvedValue(makeAgent(UserRole.AMO, "amo-123"));
      mockDemandeOwner("amo-123");
      mockAgent("agent-1");
      vi.mocked(declineAccompagnementEligible).mockResolvedValue({
        success: true,
        data: { message: "archivé", alreadyProcessed: false, valideeAt: new Date(), parcoursId: "parcours-123" },
      });

      const result = await refuserAccompagnementEligible("demande-123", "Le demandeur ne donne pas de réponse", "note");

      expect(result.success).toBe(true);
      expect(declineAccompagnementEligible).toHaveBeenCalledWith(
        "demande-123",
        "Le demandeur ne donne pas de réponse",
        "note",
        "agent-1"
      );
      // parcoursId ne doit pas fuiter vers le client.
      if (result.success) {
        expect(result.data).not.toHaveProperty("parcoursId");
      }
    });

    it("refuse une raison d'archivage vide", async () => {
      vi.mocked(getCurrentUser).mockResolvedValue(makeAgent(UserRole.AMO, "amo-123"));
      mockDemandeOwner("amo-123");

      const result = await refuserAccompagnementEligible("demande-123", "   ");

      expect(result.success).toBe(false);
      if (!result.success) expect(result.error).toContain("raison d'archivage");
      expect(declineAccompagnementEligible).not.toHaveBeenCalled();
    });

    it("DENY : AMO d'une autre entreprise", async () => {
      vi.mocked(getCurrentUser).mockResolvedValue(makeAgent(UserRole.AMO, "amo-123"));
      mockDemandeOwner("amo-999");

      const result = await refuserAccompagnementEligible("demande-123", "Autre");

      expect(result.success).toBe(false);
      expect(declineAccompagnementEligible).not.toHaveBeenCalled();
    });

    it("DENY : ALLERS_VERS (rôle non AMO)", async () => {
      vi.mocked(getCurrentUser).mockResolvedValue(makeAgent(UserRole.ALLERS_VERS));

      const result = await refuserAccompagnementEligible("demande-123", "Autre");

      expect(result.success).toBe(false);
      if (!result.success) expect(result.error).toBe("Accès réservé aux AMO");
      expect(declineAccompagnementEligible).not.toHaveBeenCalled();
    });

    it("DENY : super-admin en lecture seule", async () => {
      vi.mocked(assertNotSuperAdminReadOnly).mockResolvedValue("Lecture seule");

      const result = await refuserAccompagnementEligible("demande-123", "Autre");

      expect(result.success).toBe(false);
      expect(declineAccompagnementEligible).not.toHaveBeenCalled();
    });
  });

  // Cellules négatives RBAC (anti-fuite) — cf. RBAC-TEST-PLAN §7
  describe("RBAC — accepterAccompagnement / refuserDemandeNonEligible (verifyAmoOwnership)", () => {
    it.each([UserRole.ANALYSTE, UserRole.ALLERS_VERS])("refuse l'accès au rôle %s (réservé AMO)", async (role) => {
      vi.mocked(getCurrentUser).mockResolvedValue(makeAgent(role, null));

      const accept = await accepterAccompagnement("demande-123");
      const refuse = await refuserDemandeNonEligible("demande-123", "Commentaire détaillé suffisant");

      expect(accept.success).toBe(false);
      expect(refuse.success).toBe(false);
      if (!accept.success) expect(accept.error).toBe("Accès réservé aux AMO");
      // Ni la validation ni le refus ne touchent le service métier
      expect(approveValidation).not.toHaveBeenCalled();
      expect(rejectEligibility).not.toHaveBeenCalled();
    });

    it("refuse un AMO propriétaire d'une AUTRE entreprise (SCOPE:owner)", async () => {
      vi.mocked(getCurrentUser).mockResolvedValue(makeAgent(UserRole.AMO, "amo-A"));
      mockDemandeOwner("amo-B"); // la demande appartient à une autre entreprise

      const result = await accepterAccompagnement("demande-123", "Commentaire");

      expect(result.success).toBe(false);
      if (!result.success) expect(result.error).toBe("Cette demande ne vous est pas destinée");
      expect(approveValidation).not.toHaveBeenCalled();
    });

    it("refuse un AMO sans entreprise configurée", async () => {
      vi.mocked(getCurrentUser).mockResolvedValue(makeAgent(UserRole.AMO, null));

      const result = await accepterAccompagnement("demande-123", "Commentaire");

      expect(result.success).toBe(false);
      if (!result.success) expect(result.error).toBe("Votre compte AMO n'est pas configuré");
      expect(approveValidation).not.toHaveBeenCalled();
    });

    it("refuse le SUPER_ADMINISTRATEUR (espace agent en lecture seule)", async () => {
      vi.mocked(assertNotSuperAdminReadOnly).mockResolvedValue(
        "Action non autorisée : l'espace agent est en lecture seule pour les super administrateurs."
      );

      const result = await accepterAccompagnement("demande-123", "Commentaire");

      expect(result.success).toBe(false);
      if (!result.success) expect(result.error).toContain("lecture seule");
      // La garde lecture seule court-circuite avant toute vérification d'ownership
      expect(getCurrentUser).not.toHaveBeenCalled();
      expect(approveValidation).not.toHaveBeenCalled();
    });
  });
});
