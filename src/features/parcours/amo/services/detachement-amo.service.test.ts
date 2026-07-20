import { describe, it, expect, vi, beforeEach } from "vitest";
import { db } from "@/shared/database/client";
import { StatutValidationAmo } from "../domain/value-objects";
import { AttributionAmoMode } from "@/shared/domain/value-objects/attribution-amo-mode.enum";
import { Step, Status } from "../../core";

vi.mock("@/shared/database/client", () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    transaction: vi.fn(),
  },
}));
import { detacherAmo } from "./detachement-amo.service";

/** Chaîne `db.select(...).from(...).where(...).limit(...)` -> rows (un appel). */
function mockSelectOnce(rows: unknown[]) {
  vi.mocked(db.select).mockReturnValueOnce({
    from: () => ({ where: () => ({ limit: () => Promise.resolve(rows) }) }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);
}

/** Capture les payloads passés à `.set()` dans la transaction. */
function mockTransactionCapturingSets(): { sets: Record<string, unknown>[] } {
  const sets: Record<string, unknown>[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  vi.mocked(db.transaction).mockImplementation(async (fn: any) => fn(db));
  vi.mocked(db.update).mockReturnValue({
    set: (payload: Record<string, unknown>) => {
      sets.push(payload);
      return { where: () => Promise.resolve(undefined) };
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);
  return { sets };
}

const parcoursChoixAmo = {
  id: "p1",
  userId: "u1",
  currentStep: Step.CHOIX_AMO,
  currentStatus: Status.EN_INSTRUCTION,
  archivedAt: null,
};
const validationValidee = {
  id: "val-1",
  statut: StatutValidationAmo.LOGEMENT_ELIGIBLE,
  entrepriseAmoId: "e1",
  userNom: "Abitbol",
  userPrenom: "Georges",
};
const entreprise = { nom: "SOLHA Indre", emails: "contact@solha.fr" };

describe("detacherAmo", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("bascule la validation en sans_amo et purge l'entreprise, le mandataire et la demande d'arrêt", async () => {
    mockSelectOnce([parcoursChoixAmo]);
    mockSelectOnce([validationValidee]);
    mockSelectOnce([entreprise]);
    const { sets } = mockTransactionCapturingSets();

    const result = await detacherAmo({ parcoursId: "p1" });

    expect(result.success).toBe(true);
    expect(sets[0]).toMatchObject({
      entrepriseAmoId: null,
      statut: StatutValidationAmo.SANS_AMO,
      attributionMode: AttributionAmoMode.AUCUN,
      estMandataireFinancier: null,
      demandeArretAt: null,
      valideeAt: null,
      commentaire: null,
    });
  });

  it("avance à eligibilite/todo si le parcours est encore à choix_amo", async () => {
    mockSelectOnce([parcoursChoixAmo]);
    mockSelectOnce([validationValidee]);
    mockSelectOnce([entreprise]);
    const { sets } = mockTransactionCapturingSets();

    const result = await detacherAmo({ parcoursId: "p1" });

    expect(result.success).toBe(true);
    if (result.success) expect(result.data.etapeAvancee).toBe(true);
    expect(sets).toContainEqual(expect.objectContaining({ currentStep: Step.ELIGIBILITE, currentStatus: Status.TODO }));
  });

  it("laisse l'étape inchangée si le parcours a dépassé choix_amo", async () => {
    mockSelectOnce([{ ...parcoursChoixAmo, currentStep: Step.DIAGNOSTIC }]);
    mockSelectOnce([validationValidee]);
    mockSelectOnce([entreprise]);
    const { sets } = mockTransactionCapturingSets();

    const result = await detacherAmo({ parcoursId: "p1" });

    expect(result.success).toBe(true);
    if (result.success) expect(result.data.etapeAvancee).toBe(false);
    expect(sets).not.toContainEqual(expect.objectContaining({ currentStep: Step.ELIGIBILITE }));
  });

  it("remonte l'AMO détachée pour permettre la notification après coup", async () => {
    mockSelectOnce([parcoursChoixAmo]);
    mockSelectOnce([validationValidee]);
    mockSelectOnce([entreprise]);
    mockTransactionCapturingSets();

    const result = await detacherAmo({ parcoursId: "p1" });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.amoNom).toBe("SOLHA Indre");
      expect(result.data.amoEmails).toBe("contact@solha.fr");
      expect(result.data.entrepriseAmoId).toBe("e1");
    }
  });

  it("refuse un parcours déjà sans AMO (idempotence)", async () => {
    mockSelectOnce([parcoursChoixAmo]);
    mockSelectOnce([{ ...validationValidee, statut: StatutValidationAmo.SANS_AMO, entrepriseAmoId: null }]);

    const result = await detacherAmo({ parcoursId: "p1" });

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toContain("déjà sans AMO");
    expect(db.transaction).not.toHaveBeenCalled();
  });

  it("refuse un parcours archivé", async () => {
    mockSelectOnce([{ ...parcoursChoixAmo, archivedAt: new Date() }]);
    mockSelectOnce([validationValidee]);

    const result = await detacherAmo({ parcoursId: "p1" });

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toContain("archivé");
    expect(db.transaction).not.toHaveBeenCalled();
  });

  it("refuse si aucune validation AMO", async () => {
    mockSelectOnce([parcoursChoixAmo]);
    mockSelectOnce([]);

    const result = await detacherAmo({ parcoursId: "p1" });

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toContain("Aucune validation");
  });

  it("refuse si le parcours est introuvable", async () => {
    mockSelectOnce([]);

    const result = await detacherAmo({ parcoursId: "inconnu" });

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toContain("introuvable");
  });
});
