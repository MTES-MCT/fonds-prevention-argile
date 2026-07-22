import { describe, it, expect, vi, beforeEach } from "vitest";
import { approveValidation, rejectEligibility, getValidationByToken } from "./amo-validation.service";
import { db } from "@/shared/database/client";
import { getAmoById } from "./amo-query.service";
import { StatutValidationAmo } from "../domain/value-objects";
import { emitBrevoEvent, BREVO_EVENTS, BREVO_ATTRS } from "@/shared/email/brevo";

// Mock des dépendances
vi.mock("@/shared/database/client", () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    transaction: vi.fn(),
  },
}));

vi.mock("./amo-query.service", () => ({
  checkAmoCoversCodeInsee: vi.fn(),
  getAmoById: vi.fn(),
}));

vi.mock("@/shared/email/actions/send-email.actions", () => ({
  sendValidationAmoEmail: vi.fn(),
}));

vi.mock("@/shared/email/brevo", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/shared/email/brevo")>()),
  emitBrevoEvent: vi.fn(),
}));

const mockedEmit = vi.mocked(emitBrevoEvent);

// Mock de crypto.randomUUID
vi.stubGlobal("crypto", {
  randomUUID: vi.fn(() => "mock-uuid-token"),
});

/**
 * Helper : configure `db.transaction` pour appeler le callback avec un tx mocké.
 * `tx` est juste `db` lui-même — les tests configurent ensuite `db.update` et `db.select`.
 */
function mockTransactionPassthrough() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  vi.mocked(db.transaction).mockImplementation(async (fn: any) => fn(db));
}

/**
 * Helper : configure la chaîne `db.update(...).set(...).where(...).returning(...)` pour
 * retourner le résultat fourni. Utiliser `mockReturnValueOnce` permet de chaîner plusieurs
 * appels successifs.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mockUpdateReturning(rows: any[]) {
  vi.mocked(db.update).mockReturnValueOnce({
    set: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue(rows),
      }),
    }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);
}

/**
 * Helper : configure une chaîne `db.update(...).set(...).where(...)` sans `.returning()`
 * (cas du UPDATE token et du UPDATE parcours sans condition de retour).
 */
function mockUpdateNoReturning() {
  vi.mocked(db.update).mockReturnValueOnce({
    set: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined),
    }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);
}

/**
 * Helper : configure une chaîne `db.select(...).from(...).where(...).limit(...)`.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mockSelectLimit(rows: any[]) {
  vi.mocked(db.select).mockReturnValueOnce({
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue(rows),
      }),
    }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);
}

describe("amo-validation.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTransactionPassthrough();
  });

  describe("approveValidation", () => {
    const validationId = "validation-001";
    const parcoursId = "parcours-789";

    it("approuve une validation et fait avancer le parcours à ELIGIBILITE/TODO", async () => {
      // 1. UPDATE validation conditional → retourne la row mise à jour
      mockUpdateReturning([{ id: validationId, parcoursId }]);
      // 2. UPDATE token → no returning
      mockUpdateNoReturning();
      // 3. UPDATE parcours conditional → retourne le parcours mis à jour
      mockUpdateReturning([{ id: parcoursId }]);

      const result = await approveValidation(validationId, "commentaire test");

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.message).toBe("Logement validé comme éligible");
        expect(result.data.alreadyProcessed).toBe(false);
        expect(result.data.valideeAt).toBeInstanceOf(Date);
      }
      expect(db.transaction).toHaveBeenCalledTimes(1);
      expect(db.update).toHaveBeenCalledTimes(3);
      expect(mockedEmit).toHaveBeenCalledWith(parcoursId, BREVO_EVENTS.AMO_REPONSE, {
        attributes: {
          [BREVO_ATTRS.A_AMO]: true,
          [BREVO_ATTRS.AMO_STATUT]: StatutValidationAmo.LOGEMENT_ELIGIBLE,
        },
        eventProperties: { decision: "eligible" },
      });
    });

    it("persiste estMandataireFinancier et le commentaire (note) dans la validation", async () => {
      const setSpy = vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: validationId, parcoursId }]),
        }),
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.mocked(db.update).mockReturnValueOnce({ set: setSpy } as any);
      mockUpdateNoReturning(); // token
      mockUpdateReturning([{ id: parcoursId }]); // parcours

      const result = await approveValidation(validationId, "Eu au téléphone, projet motivé", true);

      expect(result.success).toBe(true);
      expect(setSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          estMandataireFinancier: true,
          commentaire: "Eu au téléphone, projet motivé",
        })
      );
      expect(mockedEmit).toHaveBeenCalledWith(parcoursId, BREVO_EVENTS.AMO_REPONSE, {
        attributes: {
          [BREVO_ATTRS.A_AMO]: true,
          [BREVO_ATTRS.AMO_STATUT]: StatutValidationAmo.LOGEMENT_ELIGIBLE,
          [BREVO_ATTRS.EST_MANDATAIRE]: true,
        },
        eventProperties: { decision: "eligible", est_mandataire: true },
      });
    });

    it("met estMandataireFinancier à null quand l'AMO ne répond pas", async () => {
      const setSpy = vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: validationId, parcoursId }]),
        }),
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.mocked(db.update).mockReturnValueOnce({ set: setSpy } as any);
      mockUpdateNoReturning();
      mockUpdateReturning([{ id: parcoursId }]);

      await approveValidation(validationId);

      expect(setSpy).toHaveBeenCalledWith(expect.objectContaining({ estMandataireFinancier: null }));
    });

    it("est idempotent : un second appel sur une validation déjà traitée retourne alreadyProcessed:true", async () => {
      const alreadyValideeAt = new Date("2026-05-22T11:37:00Z");
      // 1. UPDATE validation conditional → 0 row (déjà validée)
      mockUpdateReturning([]);
      // 2. SELECT validation → trouve la row déjà validée
      mockSelectLimit([{ id: validationId, valideeAt: alreadyValideeAt }]);

      const result = await approveValidation(validationId);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.alreadyProcessed).toBe(true);
        expect(result.data.valideeAt).toEqual(alreadyValideeAt);
        expect(result.data.message).toBe("Demande déjà traitée");
      }
      // Pas d'UPDATE supplémentaire (ni token ni parcours)
      expect(db.update).toHaveBeenCalledTimes(1);
      // alreadyProcessed → pas d'évènement Brevo
      expect(mockedEmit).not.toHaveBeenCalled();
    });

    it("retourne 'Validation non trouvée' si l'ID n'existe pas", async () => {
      mockUpdateReturning([]); // UPDATE conditional 0 row
      mockSelectLimit([]); // SELECT confirme : aucune row

      const result = await approveValidation(validationId);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Validation non trouvée");
      }
    });

    it("warn et continue si le parcours n'est plus à CHOIX_AMO/INVITATION (skip transition step)", async () => {
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      mockUpdateReturning([{ id: validationId, parcoursId }]); // validation OK
      mockUpdateNoReturning(); // token OK
      mockUpdateReturning([]); // parcours conditional 0 row (déjà avancé)

      const result = await approveValidation(validationId);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.alreadyProcessed).toBe(false);
      }
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("déjà progressé hors CHOIX_AMO/INVITATION"));

      warnSpy.mockRestore();
    });
  });

  describe("rejectEligibility", () => {
    const validationId = "validation-001";
    const parcoursId = "parcours-789";
    const commentaire = "Logement hors zone à risque";

    it("refuse une validation et remet le parcours en TODO sur CHOIX_AMO", async () => {
      mockUpdateReturning([{ id: validationId, parcoursId }]);
      mockUpdateNoReturning(); // token
      mockUpdateNoReturning(); // parcours (pas de returning ici)

      const result = await rejectEligibility(validationId, commentaire);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.message).toBe("Logement refusé : non éligible");
        expect(result.data.alreadyProcessed).toBe(false);
      }
      expect(db.update).toHaveBeenCalledTimes(3);
      expect(mockedEmit).toHaveBeenCalledWith(parcoursId, BREVO_EVENTS.AMO_REPONSE, {
        attributes: {
          [BREVO_ATTRS.A_AMO]: true,
          [BREVO_ATTRS.AMO_STATUT]: StatutValidationAmo.LOGEMENT_NON_ELIGIBLE,
        },
        eventProperties: { decision: "non_eligible" },
      });
    });

    it("est idempotent : un second appel retourne alreadyProcessed:true", async () => {
      const alreadyValideeAt = new Date("2026-05-22T11:37:00Z");
      mockUpdateReturning([]); // UPDATE conditional 0 row
      mockSelectLimit([{ id: validationId, valideeAt: alreadyValideeAt }]);

      const result = await rejectEligibility(validationId, commentaire);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.alreadyProcessed).toBe(true);
        expect(result.data.valideeAt).toEqual(alreadyValideeAt);
      }
      expect(db.update).toHaveBeenCalledTimes(1);
    });

    it("retourne 'Validation non trouvée' si l'ID n'existe pas", async () => {
      mockUpdateReturning([]);
      mockSelectLimit([]);

      const result = await rejectEligibility(validationId, commentaire);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Validation non trouvée");
      }
    });
  });

  describe("getValidationByToken", () => {
    const validToken = "valid-token-123";
    const mockTokenData = {
      tokenId: "token-001",
      expiresAt: new Date("2027-12-31T23:59:59Z"),
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
      rgaSimulationData: { logement: { commune: "75001" } },
    };

    const mockAmo = {
      id: "amo-456",
      nom: "AMO Test",
      emails: "contact@amo-test.fr",
      siret: "12345678901234",
      departements: "75",
      telephone: "0123456789",
      adresse: "1 rue AMO",
      horaires: null,
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function mockTokenSelect(rows: any) {
      const arr = Array.isArray(rows) ? rows : [rows];
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue(arr),
          }),
        }),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);
    }

    beforeEach(() => {
      vi.setSystemTime(new Date("2025-01-15T10:00:00Z"));
      mockTokenSelect(mockTokenData);
      vi.mocked(getAmoById).mockResolvedValue(mockAmo);
    });

    it("réussit avec un token valide", async () => {
      const result = await getValidationByToken(validToken);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.validationId).toBe(mockTokenData.validationId);
        expect(result.data.demandeur.codeInsee).toBe("75001");
        expect(result.data.isExpired).toBe(false);
        expect(result.data.isUsed).toBe(false);
      }
    });

    it("échoue si le token est introuvable", async () => {
      mockTokenSelect([]);
      const result = await getValidationByToken("invalid-token");
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Token invalide ou introuvable");
      }
    });

    it("échoue si le token est expiré", async () => {
      mockTokenSelect({ ...mockTokenData, expiresAt: new Date("2020-01-01T00:00:00Z") });
      const result = await getValidationByToken(validToken);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Ce token a expiré");
      }
    });

    it("détecte un token utilisé", async () => {
      mockTokenSelect({ ...mockTokenData, usedAt: new Date("2025-01-14T10:00:00Z") });
      const result = await getValidationByToken(validToken);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.isUsed).toBe(true);
      }
    });

    it("échoue si l'AMO n'est pas trouvée", async () => {
      vi.mocked(getAmoById).mockResolvedValue(null);
      const result = await getValidationByToken(validToken);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("AMO non trouvée");
      }
    });
  });
});
