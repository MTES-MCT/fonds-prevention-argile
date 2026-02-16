import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  approveValidation,
  rejectEligibility,
  rejectAccompagnement,
  getValidationByToken,
} from "./amo-validation.service";
import { db } from "@/shared/database/client";
import { parcoursRepo } from "@/shared/database/repositories";
import { getAmoById } from "./amo-query.service";
import { moveToNextStep } from "../../core/services";
import { Status, Step } from "../../core";
import { SituationParticulier } from "@/shared/domain/value-objects/situation-particulier.enum";
import type { StatutValidationAmo } from "../domain/value-objects";

// Mock des dépendances
vi.mock("@/shared/database/client", () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock("@/shared/database/repositories", () => ({
  parcoursRepo: {
    findByUserId: vi.fn(),
    findById: vi.fn(),
    updateStatus: vi.fn(),
  },
}));

vi.mock("./amo-query.service", () => ({
  checkAmoCoversCodeInsee: vi.fn(),
  getAmoById: vi.fn(),
}));

vi.mock("@/shared/email/actions/send-email.actions", () => ({
  sendValidationAmoEmail: vi.fn(),
}));

vi.mock("../../core/services", () => ({
  moveToNextStep: vi.fn(),
}));

// Mock de crypto.randomUUID
vi.stubGlobal("crypto", {
  randomUUID: vi.fn(() => "mock-uuid-token"),
});

describe("amo-validation.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getValidationByToken", () => {
    const validToken = "valid-token-123";
    const mockTokenData = {
      tokenId: "token-001",
      expiresAt: new Date("2025-12-31T23:59:59Z"),
      usedAt: null,
      validationId: "validation-001",
      statut: "en_attente" as StatutValidationAmo,
      choisieAt: new Date("2025-01-15T10:00:00Z"),
      entrepriseAmoId: "amo-456",
      userNom: "Dupont",
      userPrenom: "Jean",
      userEmail: "jean.dupont@example.com",
      userTelephone: "0123456789",
      adresseLogement: "123 rue de la Paix",
      parcoursId: "parcours-789",
      rgaSimulationData: {
        logement: {
          commune: "75001",
        },
      },
    };

    const mockAmo = {
      id: "amo-456",
      nom: "AMO Test",
      emails: "contact@amo-test.fr",
      siret: "12345678901234",
      departements: "75",
      telephone: "0123456789",
      adresse: "1 rue AMO",
    };

    beforeEach(() => {
      vi.setSystemTime(new Date("2025-01-15T10:00:00Z"));

      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockTokenData]),
          }),
        }),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      vi.mocked(getAmoById).mockResolvedValue(mockAmo);
    });

    it("devrait réussir avec un token valide", async () => {
      const result = await getValidationByToken(validToken);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({
          validationId: mockTokenData.validationId,
          entrepriseAmo: mockAmo,
          demandeur: {
            codeInsee: "75001",
            nom: mockTokenData.userNom,
            prenom: mockTokenData.userPrenom,
            adresseLogement: mockTokenData.adresseLogement,
            email: mockTokenData.userEmail,
            telephone: mockTokenData.userTelephone,
          },
          statut: mockTokenData.statut,
          choisieAt: mockTokenData.choisieAt,
          usedAt: null,
          isExpired: false,
          isUsed: false,
        });
      }
    });

    it("devrait échouer si le token est introuvable", async () => {
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      const result = await getValidationByToken("invalid-token");

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Token invalide ou introuvable");
      }
    });

    it("devrait échouer si le token est expiré", async () => {
      const expiredTokenData = {
        ...mockTokenData,
        expiresAt: new Date("2020-01-01T00:00:00Z"),
      };

      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([expiredTokenData]),
          }),
        }),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      const result = await getValidationByToken(validToken);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Ce token a expiré");
      }
    });

    it("devrait détecter correctement un token utilisé", async () => {
      const usedTokenData = {
        ...mockTokenData,
        usedAt: new Date("2025-01-14T10:00:00Z"),
      };

      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([usedTokenData]),
          }),
        }),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      const result = await getValidationByToken(validToken);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.isUsed).toBe(true);
        expect(result.data.usedAt).toEqual(usedTokenData.usedAt);
      }
    });

    it("devrait échouer si l'AMO n'est pas trouvée", async () => {
      vi.mocked(getAmoById).mockResolvedValue(null);

      const result = await getValidationByToken(validToken);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("AMO non trouvée");
      }
    });

    it("devrait gérer les données personnelles manquantes", async () => {
      const tokenDataWithNulls = {
        ...mockTokenData,
        userNom: null,
        userPrenom: null,
        userEmail: null,
        userTelephone: null,
        adresseLogement: null,
        rgaSimulationData: null,
      };

      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([tokenDataWithNulls]),
          }),
        }),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      const result = await getValidationByToken(validToken);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.demandeur).toEqual({
          codeInsee: "",
          nom: "",
          prenom: "",
          adresseLogement: "",
          email: "",
          telephone: "",
        });
      }
    });
  });

  describe("approveValidation", () => {
    const validationId = "validation-001";
    const parcoursId = "parcours-789";
    const userId = "user-123";

    const mockValidation = {
      id: validationId,
      parcoursId,
    };

    const mockParcours = {
      id: parcoursId,
      createdAt: new Date("2025-01-01T00:00:00Z"),
      updatedAt: new Date("2025-01-01T00:00:00Z"),
      userId,
      currentStep: Step.CHOIX_AMO,
      currentStatus: Status.EN_INSTRUCTION,
      completedAt: null,
      rgaSimulationData: null,
      rgaSimulationCompletedAt: null,
      rgaDataDeletedAt: null,
      rgaDataDeletionReason: null,
      situationParticulier: SituationParticulier.PROSPECT,
      rgaSimulationDataAgent: null,
      rgaSimulationAgentEditedAt: null,
      rgaSimulationAgentEditedBy: null,
      archivedAt: null,
      archiveReason: null,
    };

    beforeEach(() => {
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockValidation]),
          }),
        }),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      vi.mocked(parcoursRepo.findById).mockResolvedValue(mockParcours);

      vi.mocked(db.update).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      vi.mocked(parcoursRepo.updateStatus).mockResolvedValue(mockParcours);

      vi.mocked(moveToNextStep).mockResolvedValue({
        success: true,
        data: {
          state: {
            step: Step.ELIGIBILITE,
            status: Status.TODO,
          },
          complete: false,
        },
      });
    });

    it("devrait approuver la validation avec succès", async () => {
      const result = await approveValidation(validationId);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.message).toBe("Logement validé comme éligible");
      }
    });

    it("devrait mettre à jour le statut à logement_eligible", async () => {
      await approveValidation(validationId);

      expect(db.update).toHaveBeenCalled();
      const updateCall = vi.mocked(db.update).mock.results[0];
      expect(updateCall.value.set).toHaveBeenCalledWith(
        expect.objectContaining({
          statut: "logement_eligible",
          valideeAt: expect.any(Date),
        })
      );
    });

    it("devrait sauvegarder le commentaire optionnel", async () => {
      const commentaire = "Excellent dossier, logement conforme";

      await approveValidation(validationId, commentaire);

      const updateCall = vi.mocked(db.update).mock.results[0];
      expect(updateCall.value.set).toHaveBeenCalledWith(
        expect.objectContaining({
          commentaire,
        })
      );
    });

    it("devrait marquer le token comme utilisé", async () => {
      await approveValidation(validationId);

      expect(db.update).toHaveBeenCalled();
    });

    it("devrait supprimer les données personnelles (RGPD)", async () => {
      await approveValidation(validationId);

      expect(db.update).toHaveBeenCalled();
    });

    it("devrait passer le parcours en VALIDE", async () => {
      await approveValidation(validationId);

      expect(parcoursRepo.updateStatus).toHaveBeenCalledWith(parcoursId, Status.VALIDE);
    });

    it("devrait faire progresser vers l'étape ELIGIBILITE", async () => {
      await approveValidation(validationId);

      expect(moveToNextStep).toHaveBeenCalledWith(userId);
    });

    it("devrait échouer si la validation n'est pas trouvée", async () => {
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      const result = await approveValidation(validationId);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Validation non trouvée");
      }
    });

    it("devrait échouer si le parcours n'est pas trouvé", async () => {
      vi.mocked(parcoursRepo.findById).mockResolvedValue(null);

      const result = await approveValidation(validationId);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Parcours non trouvé");
      }
    });

    it("devrait échouer si la progression vers l'étape suivante échoue", async () => {
      vi.mocked(moveToNextStep).mockResolvedValue({
        success: false,
        error: "Erreur progression",
      });

      const result = await approveValidation(validationId);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Erreur lors de la progression vers l'éligibilité");
      }
    });
  });

  describe("rejectEligibility", () => {
    const validationId = "validation-001";
    const commentaire = "Le logement n'est pas dans une zone à risque";

    const mockValidation = {
      id: validationId,
      parcoursId: "parcours-789",
      statut: "logement_non_eligible" as StatutValidationAmo,
    };

    const mockParcours = {
      id: "parcours-789",
      createdAt: new Date("2025-01-01T00:00:00Z"),
      updatedAt: new Date("2025-01-01T00:00:00Z"),
      userId: "user-123",
      currentStep: Step.CHOIX_AMO,
      currentStatus: Status.EN_INSTRUCTION,
      completedAt: null,
      rgaSimulationData: null,
      rgaSimulationCompletedAt: null,
      rgaDataDeletedAt: null,
      rgaDataDeletionReason: null,
      situationParticulier: SituationParticulier.PROSPECT,
      rgaSimulationDataAgent: null,
      rgaSimulationAgentEditedAt: null,
      rgaSimulationAgentEditedBy: null,
      archivedAt: null,
      archiveReason: null,
    };

    beforeEach(() => {
      vi.mocked(db.update).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([mockValidation]),
          }),
        }),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      vi.mocked(parcoursRepo.updateStatus).mockResolvedValue(mockParcours);
    });

    it("devrait refuser l'éligibilité avec succès", async () => {
      const result = await rejectEligibility(validationId, commentaire);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.message).toBe("Logement refusé : non éligible");
      }
    });

    it("devrait mettre à jour le statut à logement_non_eligible", async () => {
      await rejectEligibility(validationId, commentaire);

      expect(db.update).toHaveBeenCalled();
      const updateCall = vi.mocked(db.update).mock.results[0];
      expect(updateCall.value.set).toHaveBeenCalledWith({
        statut: "logement_non_eligible",
        commentaire,
        valideeAt: expect.any(Date),
      });
    });

    it("devrait marquer le token comme utilisé", async () => {
      await rejectEligibility(validationId, commentaire);

      expect(db.update).toHaveBeenCalled();
    });

    it("devrait supprimer les données personnelles (RGPD)", async () => {
      await rejectEligibility(validationId, commentaire);

      expect(db.update).toHaveBeenCalled();
    });

    it("devrait repasser le parcours en TODO", async () => {
      await rejectEligibility(validationId, commentaire);

      expect(parcoursRepo.updateStatus).toHaveBeenCalledWith(mockValidation.parcoursId, Status.TODO);
    });

    it("devrait échouer si la validation n'est pas trouvée", async () => {
      vi.mocked(db.update).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([]),
          }),
        }),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      const result = await rejectEligibility(validationId, commentaire);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Validation non trouvée");
      }
    });
  });

  describe("rejectAccompagnement", () => {
    const validationId = "validation-001";
    const commentaire = "Nous ne pouvons pas accompagner ce projet";

    const mockValidation = {
      id: validationId,
      parcoursId: "parcours-789",
      statut: "accompagnement_refuse" as StatutValidationAmo,
    };

    const mockParcours = {
      id: "parcours-789",
      createdAt: new Date("2025-01-01T00:00:00Z"),
      updatedAt: new Date("2025-01-01T00:00:00Z"),
      userId: "user-123",
      currentStep: Step.CHOIX_AMO,
      currentStatus: Status.EN_INSTRUCTION,
      completedAt: null,
      rgaSimulationData: null,
      rgaSimulationCompletedAt: null,
      rgaDataDeletedAt: null,
      rgaDataDeletionReason: null,
      situationParticulier: SituationParticulier.PROSPECT,
      rgaSimulationDataAgent: null,
      rgaSimulationAgentEditedAt: null,
      rgaSimulationAgentEditedBy: null,
      archivedAt: null,
      archiveReason: null,
    };

    beforeEach(() => {
      vi.mocked(db.update).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([mockValidation]),
          }),
        }),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      vi.mocked(parcoursRepo.updateStatus).mockResolvedValue(mockParcours);
    });

    it("devrait refuser l'accompagnement avec succès", async () => {
      const result = await rejectAccompagnement(validationId, commentaire);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.message).toBe("Accompagnement refusé");
      }
    });

    it("devrait mettre à jour le statut à accompagnement_refuse", async () => {
      await rejectAccompagnement(validationId, commentaire);

      expect(db.update).toHaveBeenCalled();
      const updateCall = vi.mocked(db.update).mock.results[0];
      expect(updateCall.value.set).toHaveBeenCalledWith({
        statut: "accompagnement_refuse",
        commentaire,
        valideeAt: expect.any(Date),
      });
    });

    it("devrait marquer le token comme utilisé", async () => {
      await rejectAccompagnement(validationId, commentaire);

      expect(db.update).toHaveBeenCalled();
    });

    it("devrait supprimer les données personnelles (RGPD)", async () => {
      await rejectAccompagnement(validationId, commentaire);

      expect(db.update).toHaveBeenCalled();
    });

    it("devrait repasser le parcours en TODO", async () => {
      await rejectAccompagnement(validationId, commentaire);

      expect(parcoursRepo.updateStatus).toHaveBeenCalledWith(mockValidation.parcoursId, Status.TODO);
    });

    it("devrait échouer si la validation n'est pas trouvée", async () => {
      vi.mocked(db.update).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([]),
          }),
        }),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      const result = await rejectAccompagnement(validationId, commentaire);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Validation non trouvée");
      }
    });
  });
});
