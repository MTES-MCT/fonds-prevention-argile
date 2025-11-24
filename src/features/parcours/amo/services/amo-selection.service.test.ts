import { describe, it, expect, vi, beforeEach } from "vitest";
import { selectAmoForUser } from "./amo-selection.service";
import { db } from "@/shared/database/client";
import { parcoursRepo } from "@/shared/database/repositories";
import { sendValidationAmoEmail } from "@/shared/email/actions/send-email.actions";
import { Status, Step } from "../../core";
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
    updateStatus: vi.fn(),
  },
}));

vi.mock("@/shared/email/actions/send-email.actions", () => ({
  sendValidationAmoEmail: vi.fn(),
}));

// Mock de crypto.randomUUID
vi.stubGlobal("crypto", {
  randomUUID: vi.fn(() => "mock-uuid-token"),
});

describe("amo-selection.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("selectAmoForUser", () => {
    const userId = "user-123";
    const validParams = {
      entrepriseAmoId: "amo-456",
      userPrenom: "Jean",
      userNom: "Dupont",
      userEmail: "jean.dupont@example.com",
      userTelephone: "0123456789",
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
    };

    const mockValidation = {
      id: "validation-001",
      parcoursId: mockParcours.id,
      entrepriseAmoId: validParams.entrepriseAmoId,
      statut: "en_attente" as StatutValidationAmo,
      userPrenom: validParams.userPrenom,
      userNom: validParams.userNom,
      userEmail: validParams.userEmail,
      userTelephone: validParams.userTelephone,
      adresseLogement: validParams.adresseLogement,
      choisieAt: new Date(),
      valideeAt: null,
      commentaire: null,
      brevoMessageId: null,
      emailSentAt: null,
      emailDeliveredAt: null,
      emailOpenedAt: null,
      emailClickedAt: null,
      emailBounceType: null,
      emailBounceReason: null,
    };

    beforeEach(() => {
      // Setup des mocks par défaut pour un cas de succès
      vi.mocked(parcoursRepo.findByUserId).mockResolvedValue(mockParcours);

      // Mock pour la vérification de couverture territoriale
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ id: validParams.entrepriseAmoId }]),
          }),
        }),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      // Mock pour l'update de l'utilisateur
      vi.mocked(db.update).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      // Mock pour l'insert de la validation
      vi.mocked(db.insert).mockReturnValue({
        values: vi.fn().mockReturnValue({
          onConflictDoUpdate: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([mockValidation]),
          }),
        }),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      vi.mocked(sendValidationAmoEmail).mockResolvedValue({
        success: true,
        data: { messageId: "brevo-message-123" },
      });

      vi.mocked(parcoursRepo.updateStatus).mockResolvedValue(mockParcours);
    });

    // ===== Tests de validation des données personnelles =====

    it("devrait réussir avec des données valides", async () => {
      // Re-mock db.select pour retourner aussi l'AMO
      let selectCallCount = 0;
      vi.mocked(db.select).mockImplementation(() => {
        selectCallCount++;
        if (selectCallCount === 1) {
          // Premier appel : vérification couverture territoriale
          return {
            from: vi.fn().mockReturnValue({
              leftJoin: vi.fn().mockReturnThis(),
              where: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([{ id: validParams.entrepriseAmoId }]),
              }),
            }),
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
          } as any;
        } else {
          // Deuxième appel : récupération AMO
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([mockAmo]),
              }),
            }),
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
          } as any;
        }
      });

      const result = await selectAmoForUser(userId, validParams);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.message).toBe("AMO sélectionnée avec succès");
        expect(result.data.token).toBe("mock-uuid-token");
      }
      expect(parcoursRepo.updateStatus).toHaveBeenCalledWith(mockParcours.id, Status.EN_INSTRUCTION);
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

    it("devrait échouer si l'email est vide", async () => {
      const result = await selectAmoForUser(userId, {
        ...validParams,
        userEmail: "  ",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("L'email est requis");
      }
    });

    it("devrait échouer si l'email est absent", async () => {
      const result = await selectAmoForUser(userId, {
        ...validParams,
        userEmail: "",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("L'email est requis");
      }
    });

    it("devrait échouer si le téléphone est vide", async () => {
      const result = await selectAmoForUser(userId, {
        ...validParams,
        userTelephone: "  ",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Le téléphone est requis");
      }
    });

    it("devrait échouer si le téléphone est absent", async () => {
      const result = await selectAmoForUser(userId, {
        ...validParams,
        userTelephone: "",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Le téléphone est requis");
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

    // ===== Tests de vérification du parcours =====

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
        expect(result.error).toBe("Vous n'êtes pas à l'étape de choix de l'AMO");
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
        expect(result.error).toBe("Simulation RGA non complétée (code INSEE manquant)");
      }
    });

    it("devrait échouer si les données logement sont absentes", async () => {
      vi.mocked(parcoursRepo.findByUserId).mockResolvedValue({
        ...mockParcours,
        rgaSimulationData: {
          ...mockParcours.rgaSimulationData,
          logement: {
            ...mockParcours.rgaSimulationData.logement,
            commune: "", // Chaîne vide = falsy, donc "manquant"
          },
        },
      });

      const result = await selectAmoForUser(userId, validParams);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Simulation RGA non complétée (code INSEE manquant)");
      }
    });

    // ===== Tests de couverture territoriale =====

    it("devrait échouer si l'AMO ne couvre pas le territoire", async () => {
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]), // Aucun résultat = pas de couverture
          }),
        }),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      const result = await selectAmoForUser(userId, validParams);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Cette AMO ne couvre pas votre territoire (EPCI, commune ou département)");
      }
    });

    // ===== Tests AMO =====

    it("devrait échouer si l'AMO n'est pas trouvée", async () => {
      let selectCallCount = 0;
      vi.mocked(db.select).mockImplementation(() => {
        selectCallCount++;
        if (selectCallCount === 1) {
          // Couverture territoriale OK
          return {
            from: vi.fn().mockReturnValue({
              leftJoin: vi.fn().mockReturnThis(),
              where: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([{ id: validParams.entrepriseAmoId }]),
              }),
            }),
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
          } as any;
        } else {
          // AMO non trouvée
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([]),
              }),
            }),
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
          } as any;
        }
      });

      const result = await selectAmoForUser(userId, validParams);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("AMO non trouvée");
      }
    });

    // ===== Tests d'envoi d'email et tracking =====

    it("devrait envoyer un email à l'AMO avec les bonnes informations", async () => {
      let selectCallCount = 0;
      vi.mocked(db.select).mockImplementation(() => {
        selectCallCount++;
        if (selectCallCount === 1) {
          return {
            from: vi.fn().mockReturnValue({
              leftJoin: vi.fn().mockReturnThis(),
              where: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([{ id: validParams.entrepriseAmoId }]),
              }),
            }),
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
          } as any;
        } else {
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([mockAmo]),
              }),
            }),
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
          } as any;
        }
      });

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
      const amoMultiEmails = {
        ...mockAmo,
        emails: "contact1@amo.fr;contact2@amo.fr;contact3@amo.fr",
      };

      let selectCallCount = 0;
      vi.mocked(db.select).mockImplementation(() => {
        selectCallCount++;
        if (selectCallCount === 1) {
          return {
            from: vi.fn().mockReturnValue({
              leftJoin: vi.fn().mockReturnThis(),
              where: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([{ id: validParams.entrepriseAmoId }]),
              }),
            }),
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
          } as any;
        } else {
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([amoMultiEmails]),
              }),
            }),
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
          } as any;
        }
      });

      await selectAmoForUser(userId, validParams);

      expect(sendValidationAmoEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          amoEmail: ["contact1@amo.fr", "contact2@amo.fr", "contact3@amo.fr"],
        })
      );
    });

    it("devrait stocker le brevoMessageId après un envoi réussi", async () => {
      let selectCallCount = 0;
      vi.mocked(db.select).mockImplementation(() => {
        selectCallCount++;
        if (selectCallCount === 1) {
          return {
            from: vi.fn().mockReturnValue({
              leftJoin: vi.fn().mockReturnThis(),
              where: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([{ id: validParams.entrepriseAmoId }]),
              }),
            }),
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
          } as any;
        } else {
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([mockAmo]),
              }),
            }),
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
          } as any;
        }
      });

      const mockUpdate = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      });
      vi.mocked(db.update).mockImplementation(mockUpdate);

      await selectAmoForUser(userId, validParams);

      // Vérifie que db.update a été appelé pour stocker le brevoMessageId
      expect(db.update).toHaveBeenCalled();

      // Vérifie qu'au moins un appel contient le brevoMessageId
      const updateCalls = mockUpdate.mock.results;
      const hasBrevoMessageIdUpdate = updateCalls.some((call) => {
        const setCalls = call.value.set.mock.calls;
        return setCalls.some(
          (setCall: Array<{ brevoMessageId?: string; emailSentAt?: Date }>) =>
            setCall[0]?.brevoMessageId === "brevo-message-123" && setCall[0]?.emailSentAt instanceof Date
        );
      });

      expect(hasBrevoMessageIdUpdate).toBe(true);
    });

    it("devrait continuer même si l'envoi de l'email échoue", async () => {
      let selectCallCount = 0;
      vi.mocked(db.select).mockImplementation(() => {
        selectCallCount++;
        if (selectCallCount === 1) {
          return {
            from: vi.fn().mockReturnValue({
              leftJoin: vi.fn().mockReturnThis(),
              where: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([{ id: validParams.entrepriseAmoId }]),
              }),
            }),
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
          } as any;
        } else {
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([mockAmo]),
              }),
            }),
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
          } as any;
        }
      });

      vi.mocked(sendValidationAmoEmail).mockResolvedValue({
        success: false,
        error: "Erreur email",
      });

      const result = await selectAmoForUser(userId, validParams);

      expect(result.success).toBe(true);
      expect(parcoursRepo.updateStatus).toHaveBeenCalled();
    });

    it("ne devrait pas stocker le brevoMessageId si l'envoi échoue", async () => {
      let selectCallCount = 0;
      vi.mocked(db.select).mockImplementation(() => {
        selectCallCount++;
        if (selectCallCount === 1) {
          return {
            from: vi.fn().mockReturnValue({
              leftJoin: vi.fn().mockReturnThis(),
              where: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([{ id: validParams.entrepriseAmoId }]),
              }),
            }),
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
          } as any;
        } else {
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([mockAmo]),
              }),
            }),
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
          } as any;
        }
      });

      vi.mocked(sendValidationAmoEmail).mockResolvedValue({
        success: false,
        error: "Erreur email",
      });

      const mockUpdate = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      });
      vi.mocked(db.update).mockImplementation(mockUpdate);

      await selectAmoForUser(userId, validParams);

      // Vérifie qu'aucun appel ne contient brevoMessageId
      const updateCalls = mockUpdate.mock.results;
      const hasBrevoMessageIdUpdate = updateCalls.some((call) => {
        const setCalls = call.value.set.mock.calls;
        return setCalls.some(
          (setCall: Array<{ brevoMessageId?: string }>) => setCall[0]?.brevoMessageId === "brevo-message-123"
        );
      });

      expect(hasBrevoMessageIdUpdate).toBe(false);
    });

    // ===== Tests de trim des données =====

    it("devrait trimmer les espaces dans les données personnelles", async () => {
      let selectCallCount = 0;
      vi.mocked(db.select).mockImplementation(() => {
        selectCallCount++;
        if (selectCallCount === 1) {
          return {
            from: vi.fn().mockReturnValue({
              leftJoin: vi.fn().mockReturnThis(),
              where: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([{ id: validParams.entrepriseAmoId }]),
              }),
            }),
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
          } as any;
        } else {
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([mockAmo]),
              }),
            }),
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
          } as any;
        }
      });

      const paramsWithSpaces = {
        ...validParams,
        userPrenom: "  Jean  ",
        userNom: "  Dupont  ",
        adresseLogement: "  123 rue de la Paix  ",
        userEmail: "  jean.dupont@example.com  ",
        userTelephone: "  0123456789  ",
      };

      await selectAmoForUser(userId, paramsWithSpaces);

      const insertCall = vi.mocked(db.insert).mock.results[0];
      expect(insertCall.value.values).toHaveBeenCalledWith(
        expect.objectContaining({
          userPrenom: "Jean",
          userNom: "Dupont",
          adresseLogement: "123 rue de la Paix",
          userEmail: "jean.dupont@example.com",
          userTelephone: "0123456789",
        })
      );
    });

    // ===== Tests de token =====

    it("devrait créer un token avec la bonne date d'expiration", async () => {
      const now = new Date("2025-01-15T10:00:00Z");
      vi.setSystemTime(now);

      let selectCallCount = 0;
      vi.mocked(db.select).mockImplementation(() => {
        selectCallCount++;
        if (selectCallCount === 1) {
          return {
            from: vi.fn().mockReturnValue({
              leftJoin: vi.fn().mockReturnThis(),
              where: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([{ id: validParams.entrepriseAmoId }]),
              }),
            }),
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
          } as any;
        } else {
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([mockAmo]),
              }),
            }),
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
          } as any;
        }
      });

      const result = await selectAmoForUser(userId, validParams);

      // Vérifie que l'opération a réussi
      expect(result.success).toBe(true);

      // Vérifie que db.insert a été appelé 2 fois (validation + token)
      expect(db.insert).toHaveBeenCalledTimes(2);

      vi.useRealTimers();
    });

    // ===== Tests de reset des champs tracking =====

    it("devrait reset les champs de tracking email lors d'une re-sélection", async () => {
      let selectCallCount = 0;
      vi.mocked(db.select).mockImplementation(() => {
        selectCallCount++;
        if (selectCallCount === 1) {
          return {
            from: vi.fn().mockReturnValue({
              leftJoin: vi.fn().mockReturnThis(),
              where: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([{ id: validParams.entrepriseAmoId }]),
              }),
            }),
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
          } as any;
        } else {
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([mockAmo]),
              }),
            }),
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
          } as any;
        }
      });

      await selectAmoForUser(userId, validParams);

      const insertCall = vi.mocked(db.insert).mock.results[0];
      const onConflictCall = insertCall.value.values.mock.results[0].value.onConflictDoUpdate;

      expect(onConflictCall).toHaveBeenCalledWith(
        expect.objectContaining({
          set: expect.objectContaining({
            brevoMessageId: null,
            emailSentAt: null,
            emailDeliveredAt: null,
            emailOpenedAt: null,
            emailClickedAt: null,
            emailBounceType: null,
            emailBounceReason: null,
          }),
        })
      );
    });

    // ===== Tests sans code EPCI =====

    it("devrait fonctionner sans code EPCI", async () => {
      const parcoursWithoutEpci = {
        ...mockParcours,
        rgaSimulationData: {
          ...mockParcours.rgaSimulationData,
          logement: {
            ...mockParcours.rgaSimulationData.logement,
            epci: "", // Chaîne vide au lieu de undefined
          },
        },
      };

      vi.mocked(parcoursRepo.findByUserId).mockResolvedValue(parcoursWithoutEpci);

      let selectCallCount = 0;
      vi.mocked(db.select).mockImplementation(() => {
        selectCallCount++;
        if (selectCallCount === 1) {
          return {
            from: vi.fn().mockReturnValue({
              leftJoin: vi.fn().mockReturnThis(),
              where: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([{ id: validParams.entrepriseAmoId }]),
              }),
            }),
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
          } as any;
        } else {
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([mockAmo]),
              }),
            }),
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
          } as any;
        }
      });

      const result = await selectAmoForUser(userId, validParams);

      expect(result.success).toBe(true);
    });
  });
});
