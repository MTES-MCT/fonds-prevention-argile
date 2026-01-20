import { describe, it, expect, vi, beforeEach } from "vitest";
import { UserRole } from "@/shared/domain/value-objects/user-role.enum";

// Mock des dépendances AVANT les imports
vi.mock("@/features/auth/services/user.service", () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock("@/shared/database/client", () => ({
  db: {
    select: vi.fn(),
  },
}));

vi.mock("../services/amo-validation.service", () => ({
  approveValidation: vi.fn(),
  rejectEligibility: vi.fn(),
  rejectAccompagnement: vi.fn(),
  getValidationByToken: vi.fn(),
}));

// Import des actions APRÈS les mocks
import {
  validerLogementEligible,
  refuserLogementNonEligible,
  refuserAccompagnement,
} from "./amo-validation.actions";

// Import des mocks
import { getCurrentUser } from "@/features/auth/services/user.service";
import { db } from "@/shared/database/client";
import {
  approveValidation,
  rejectEligibility,
  rejectAccompagnement as rejectAccompagnementService,
} from "../services/amo-validation.service";

describe("amo-validation.actions - Sécurité", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Helper pour mocker un utilisateur
  const mockUser = (role: UserRole, entrepriseAmoId?: string) => {
    vi.mocked(getCurrentUser).mockResolvedValue({
      id: "user-123",
      role,
      authMethod: "proconnect",
      loginTime: new Date().toISOString(),
      agentId: "agent-123",
      entrepriseAmoId,
    });
  };

  // Helper pour mocker une validation en base
  const mockValidationInDb = (entrepriseAmoId: string) => {
    vi.mocked(db.select).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([{ entrepriseAmoId }]),
        }),
      }),
    } as unknown as ReturnType<typeof db.select>);
  };

  // Helper pour mocker une validation non trouvée
  const mockValidationNotFound = () => {
    vi.mocked(db.select).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      }),
    } as unknown as ReturnType<typeof db.select>);
  };

  describe("verifyAmoOwnership (via validerLogementEligible)", () => {
    describe("Utilisateur non authentifié", () => {
      it("devrait refuser si l'utilisateur n'est pas connecté", async () => {
        vi.mocked(getCurrentUser).mockResolvedValue(null);

        const result = await validerLogementEligible("validation-123");

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toBe("Non authentifié");
        }
        expect(approveValidation).not.toHaveBeenCalled();
      });
    });

    describe("SUPER_ADMINISTRATEUR", () => {
      it("devrait autoriser la validation de n'importe quelle demande", async () => {
        mockUser(UserRole.SUPER_ADMINISTRATEUR);
        vi.mocked(approveValidation).mockResolvedValue({
          success: true,
          data: { message: "OK" },
        });

        const result = await validerLogementEligible("validation-123");

        expect(result.success).toBe(true);
        expect(approveValidation).toHaveBeenCalledWith("validation-123", undefined);
      });
    });

    describe("ADMINISTRATEUR", () => {
      it("devrait autoriser la validation de n'importe quelle demande", async () => {
        mockUser(UserRole.ADMINISTRATEUR);
        vi.mocked(approveValidation).mockResolvedValue({
          success: true,
          data: { message: "OK" },
        });

        const result = await validerLogementEligible("validation-123", "Commentaire");

        expect(result.success).toBe(true);
        expect(approveValidation).toHaveBeenCalledWith("validation-123", "Commentaire");
      });
    });

    describe("AMO", () => {
      it("devrait autoriser la validation de ses propres demandes", async () => {
        mockUser(UserRole.AMO, "entreprise-123");
        mockValidationInDb("entreprise-123");
        vi.mocked(approveValidation).mockResolvedValue({
          success: true,
          data: { message: "OK" },
        });

        const result = await validerLogementEligible("validation-123");

        expect(result.success).toBe(true);
        expect(approveValidation).toHaveBeenCalled();
      });

      it("devrait refuser la validation des demandes d'une autre entreprise", async () => {
        mockUser(UserRole.AMO, "entreprise-123");
        mockValidationInDb("autre-entreprise-456");

        const result = await validerLogementEligible("validation-123");

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toBe("Cette demande ne vous est pas destinée");
        }
        expect(approveValidation).not.toHaveBeenCalled();
      });

      it("devrait refuser si l'AMO n'a pas d'entreprise configurée", async () => {
        mockUser(UserRole.AMO, undefined);

        const result = await validerLogementEligible("validation-123");

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toBe("Votre compte AMO n'est pas configuré");
        }
        expect(approveValidation).not.toHaveBeenCalled();
      });

      it("devrait refuser si la validation n'existe pas", async () => {
        mockUser(UserRole.AMO, "entreprise-123");
        mockValidationNotFound();

        const result = await validerLogementEligible("validation-123");

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toBe("Validation non trouvée");
        }
        expect(approveValidation).not.toHaveBeenCalled();
      });
    });

    describe("ANALYSTE", () => {
      it("devrait refuser l'accès aux analystes", async () => {
        mockUser(UserRole.ANALYSTE);

        const result = await validerLogementEligible("validation-123");

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toBe("Accès réservé aux AMO");
        }
        expect(approveValidation).not.toHaveBeenCalled();
      });
    });

    describe("PARTICULIER", () => {
      it("devrait refuser l'accès aux particuliers", async () => {
        mockUser(UserRole.PARTICULIER);

        const result = await validerLogementEligible("validation-123");

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toBe("Accès réservé aux AMO");
        }
        expect(approveValidation).not.toHaveBeenCalled();
      });
    });
  });

  describe("refuserLogementNonEligible", () => {
    it("devrait vérifier la propriété AMO avant de refuser", async () => {
      mockUser(UserRole.AMO, "entreprise-123");
      mockValidationInDb("autre-entreprise");

      const result = await refuserLogementNonEligible(
        "validation-123",
        "Le logement ne répond pas aux critères"
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Cette demande ne vous est pas destinée");
      }
      expect(rejectEligibility).not.toHaveBeenCalled();
    });

    it("devrait autoriser le refus pour son propre dossier", async () => {
      mockUser(UserRole.AMO, "entreprise-123");
      mockValidationInDb("entreprise-123");
      vi.mocked(rejectEligibility).mockResolvedValue({
        success: true,
        data: { message: "Refusé" },
      });

      const result = await refuserLogementNonEligible(
        "validation-123",
        "Le logement ne répond pas aux critères d'éligibilité"
      );

      expect(result.success).toBe(true);
      expect(rejectEligibility).toHaveBeenCalled();
    });

    it("devrait valider le commentaire minimum", async () => {
      mockUser(UserRole.AMO, "entreprise-123");
      mockValidationInDb("entreprise-123");

      const result = await refuserLogementNonEligible("validation-123", "Court");

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("minimum 10 caractères");
      }
      expect(rejectEligibility).not.toHaveBeenCalled();
    });
  });

  describe("refuserAccompagnement", () => {
    it("devrait vérifier la propriété AMO avant de refuser l'accompagnement", async () => {
      mockUser(UserRole.AMO, "entreprise-123");
      mockValidationInDb("autre-entreprise");

      const result = await refuserAccompagnement(
        "validation-123",
        "Nous ne pouvons pas accompagner ce dossier"
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Cette demande ne vous est pas destinée");
      }
      expect(rejectAccompagnementService).not.toHaveBeenCalled();
    });

    it("devrait autoriser le refus d'accompagnement pour son propre dossier", async () => {
      mockUser(UserRole.AMO, "entreprise-123");
      mockValidationInDb("entreprise-123");
      vi.mocked(rejectAccompagnementService).mockResolvedValue({
        success: true,
        data: { message: "Accompagnement refusé" },
      });

      const result = await refuserAccompagnement(
        "validation-123",
        "Nous ne pouvons pas accompagner ce dossier"
      );

      expect(result.success).toBe(true);
      expect(rejectAccompagnementService).toHaveBeenCalled();
    });

    it("devrait autoriser les admins à refuser n'importe quel accompagnement", async () => {
      mockUser(UserRole.ADMINISTRATEUR);
      vi.mocked(rejectAccompagnementService).mockResolvedValue({
        success: true,
        data: { message: "Accompagnement refusé" },
      });

      const result = await refuserAccompagnement("validation-123", "Refus admin");

      expect(result.success).toBe(true);
      expect(rejectAccompagnementService).toHaveBeenCalled();
    });
  });

  describe("Gestion des erreurs", () => {
    it("devrait gérer les erreurs de base de données", async () => {
      mockUser(UserRole.AMO, "entreprise-123");
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockRejectedValue(new Error("DB Error")),
          }),
        }),
      } as unknown as ReturnType<typeof db.select>);

      const result = await validerLogementEligible("validation-123");

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Erreur lors de la validation");
      }
    });
  });
});
