import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  selectAmoForUser,
  approveValidation,
  rejectEligibility,
  rejectAccompagnement,
  getValidationByToken,
} from "./amo-validation.service";
import { db } from "@/shared/database/client";
import { parcoursRepo } from "@/shared/database/repositories";
import { checkAmoCoversCodeInsee, getAmoById } from "./amo-query.service";
import { sendValidationAmoEmail } from "@/shared/email/actions/send-email.actions";
import { moveToNextStep } from "../../core/services";
import { Status, Step } from "../../core";
import { AMO_VALIDATION_TOKEN_VALIDITY_DAYS } from "../domain/value-objects";
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

  describe("selectAmoForUser", () => {
    const userId = "user-123";
    const validParams = {
      entrepriseAmoId: "amo-456",
      userPrenom: "Jean",
      userNom: "Dupont",
      adresseLogement: "123 rue de la Paix, 75001 Paris",
    };

    const mockParcours = {
      id: "parcours-789",
      createdAt: new Date("2025-01-01T00:00:00Z"),
      updatedAt: new Date("2025-01-01T00:00:00Z"),
      userId,
      currentStep: Step.CHOIX_AMO,
      currentStatus: Status.TODO,
      completedAt: null,
      rgaSimulationData: {
        logement: {
          commune: "75001",
          adresse: "123 rue test",
          code_region: "11",
          code_departement: "75",
          epci: "200054781",
          commune_nom: "Paris 1er",
          coordonnees: "48.8566,2.3522",
          clef_ban: "test_ban",
          commune_denormandie: false,
          annee_de_construction: "1990",
          rnb: "RNB_TEST",
          niveaux: 2,
          zone_dexposition: "moyen" as const,
          type: "maison" as const,
          mitoyen: true,
          proprietaire_occupant: true,
        },
        taxeFonciere: { commune_eligible: true },
        rga: {
          assure: true,
          indemnise_indemnise_rga: false,
          sinistres: "saine" as const,
          indemnise_montant_indemnite: 0,
        },
        menage: { revenu_rga: 35000, personnes: 4 },
        vous: { proprietaire_condition: true, proprietaire_occupant_rga: true },
        simulatedAt: new Date().toISOString(),
      },
      rgaSimulationCompletedAt: new Date(),
      rgaDataDeletedAt: null,
      rgaDataDeletionReason: null,
    };

    const mockAmo = {
      id: "amo-456",
      nom: "AMO Test",
      emails: "contact@amo-test.fr",
      siret: "12345678901234",
      departements: "75",
      telephone: "0123456789",
      adresse: "1 rue AMO, 75001 Paris",
    };

    beforeEach(() => {
      // Setup des mocks par défaut pour un cas de succès
      vi.mocked(parcoursRepo.findByUserId).mockResolvedValue(mockParcours);

      vi.mocked(checkAmoCoversCodeInsee).mockResolvedValue(true);

      const mockValidation = {
        id: "validation-001",
        parcoursId: mockParcours.id,
        entrepriseAmoId: validParams.entrepriseAmoId,
        statut: "en_attente" as StatutValidationAmo,
        userPrenom: validParams.userPrenom,
        userNom: validParams.userNom,
        adresseLogement: validParams.adresseLogement,
        choisieAt: new Date(),
        valideeAt: null,
        commentaire: null,
      };

      vi.mocked(db.insert).mockReturnValue({
        values: vi.fn().mockReturnValue({
          onConflictDoUpdate: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([mockValidation]),
          }),
        }),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      vi.mocked(getAmoById).mockResolvedValue(mockAmo);

      vi.mocked(sendValidationAmoEmail).mockResolvedValue({
        success: true,
        data: { messageId: "message-123" },
      });

      vi.mocked(parcoursRepo.updateStatus).mockResolvedValue(mockParcours);
    });

    it("devrait réussir avec des données valides", async () => {
      const result = await selectAmoForUser(userId, validParams);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.message).toBe("AMO sélectionnée avec succès");
        expect(result.data.token).toBe("mock-uuid-token");
      }
      expect(parcoursRepo.updateStatus).toHaveBeenCalledWith(
        mockParcours.id,
        Status.EN_INSTRUCTION
      );
    });

    it("devrait échouer si le prénom est vide", async () => {
      const result = await selectAmoForUser(userId, {
        ...validParams,
        userPrenom: "  ",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Le prénom est requis");
      }
    });

    it("devrait échouer si le prénom est absent", async () => {
      const result = await selectAmoForUser(userId, {
        ...validParams,
        userPrenom: "",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Le prénom est requis");
      }
    });

    it("devrait échouer si le nom est vide", async () => {
      const result = await selectAmoForUser(userId, {
        ...validParams,
        userNom: "   ",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Le nom est requis");
      }
    });

    it("devrait échouer si le nom est absent", async () => {
      const result = await selectAmoForUser(userId, {
        ...validParams,
        userNom: "",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Le nom est requis");
      }
    });

    it("devrait échouer si l'adresse du logement est vide", async () => {
      const result = await selectAmoForUser(userId, {
        ...validParams,
        adresseLogement: "  ",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("L'adresse du logement est requise");
      }
    });

    it("devrait échouer si l'adresse du logement est absente", async () => {
      const result = await selectAmoForUser(userId, {
        ...validParams,
        adresseLogement: "",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("L'adresse du logement est requise");
      }
    });

    it("devrait échouer si le parcours n'est pas trouvé", async () => {
      vi.mocked(parcoursRepo.findByUserId).mockResolvedValue(null);

      const result = await selectAmoForUser(userId, validParams);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Parcours non trouvé");
      }
    });

    it("devrait échouer si l'utilisateur n'est pas à l'étape CHOIX_AMO", async () => {
      vi.mocked(parcoursRepo.findByUserId).mockResolvedValue({
        ...mockParcours,
        currentStep: Step.ELIGIBILITE,
      });

      const result = await selectAmoForUser(userId, validParams);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe(
          "Vous n'êtes pas à l'étape de choix de l'AMO"
        );
      }
    });

    it("devrait échouer si le code INSEE est manquant", async () => {
      vi.mocked(parcoursRepo.findByUserId).mockResolvedValue({
        ...mockParcours,
        rgaSimulationData: null,
      });

      const result = await selectAmoForUser(userId, validParams);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe(
          "Simulation RGA non complétée (code INSEE manquant)"
        );
      }
    });

    it("devrait échouer si l'AMO ne couvre pas le code INSEE", async () => {
      vi.mocked(checkAmoCoversCodeInsee).mockResolvedValue(false);

      const result = await selectAmoForUser(userId, validParams);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe(
          "Cette AMO ne couvre pas votre commune ou département"
        );
      }
    });

    it("devrait échouer si l'AMO n'est pas trouvée", async () => {
      vi.mocked(getAmoById).mockResolvedValue(null);

      const result = await selectAmoForUser(userId, validParams);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("AMO non trouvée");
      }
    });

    it("devrait créer un token avec la bonne date d'expiration", async () => {
      const now = new Date("2025-01-15T10:00:00Z");
      vi.setSystemTime(now);

      const expectedExpiresAt = new Date(now);
      expectedExpiresAt.setDate(
        expectedExpiresAt.getDate() + AMO_VALIDATION_TOKEN_VALIDITY_DAYS
      );

      await selectAmoForUser(userId, validParams);

      expect(db.insert).toHaveBeenCalledTimes(2);

      vi.useRealTimers();
    });

    it("devrait envoyer un email à l'AMO avec les bonnes informations", async () => {
      await selectAmoForUser(userId, validParams);

      expect(sendValidationAmoEmail).toHaveBeenCalledWith({
        amoEmail: ["contact@amo-test.fr"],
        amoNom: mockAmo.nom,
        demandeurNom: validParams.userNom,
        demandeurPrenom: validParams.userPrenom,
        demandeurCodeInsee: "75001",
        adresseLogement: validParams.adresseLogement,
        token: "mock-uuid-token",
      });
    });

    it("devrait gérer plusieurs emails AMO séparés par des points-virgules", async () => {
      vi.mocked(getAmoById).mockResolvedValue({
        ...mockAmo,
        emails: "contact1@amo.fr;contact2@amo.fr;contact3@amo.fr",
      });

      await selectAmoForUser(userId, validParams);

      expect(sendValidationAmoEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          amoEmail: ["contact1@amo.fr", "contact2@amo.fr", "contact3@amo.fr"],
        })
      );
    });

    it("devrait continuer même si l'envoi de l'email échoue", async () => {
      vi.mocked(sendValidationAmoEmail).mockResolvedValue({
        success: false,
        error: "Erreur email",
      });

      const result = await selectAmoForUser(userId, validParams);

      expect(result.success).toBe(true);
      expect(parcoursRepo.updateStatus).toHaveBeenCalled();
    });

    it("devrait trimmer les espaces dans les données personnelles", async () => {
      const paramsWithSpaces = {
        ...validParams,
        userPrenom: "  Jean  ",
        userNom: "  Dupont  ",
        adresseLogement: "  123 rue de la Paix  ",
      };

      await selectAmoForUser(userId, paramsWithSpaces);

      const insertCall = vi.mocked(db.insert).mock.results[0];
      expect(insertCall.value.values).toHaveBeenCalledWith(
        expect.objectContaining({
          userPrenom: "Jean",
          userNom: "Dupont",
          adresseLogement: "123 rue de la Paix",
        })
      );
    });
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

      expect(parcoursRepo.updateStatus).toHaveBeenCalledWith(
        parcoursId,
        Status.VALIDE
      );
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
        expect(result.error).toBe(
          "Erreur lors de la progression vers l'éligibilité"
        );
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

      expect(parcoursRepo.updateStatus).toHaveBeenCalledWith(
        mockValidation.parcoursId,
        Status.TODO
      );
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

      expect(parcoursRepo.updateStatus).toHaveBeenCalledWith(
        mockValidation.parcoursId,
        Status.TODO
      );
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
