import { describe, it, expect, vi, beforeEach } from "vitest";
import { db } from "@/shared/database/client";
import { StatutValidationAmo } from "../domain/value-objects";
import { Step } from "../../core";

vi.mock("@/shared/database/client", () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    transaction: vi.fn(),
  },
}));
vi.mock("@/shared/email/actions/send-email.actions", () => ({
  sendValidationAmoEmail: vi.fn(),
}));
import { reouvrirDemandeRefusee } from "./reouverture-demande.service";

/** Chaîne `db.select(...).from(...).where(...).limit(...)` -> rows (un appel). */
function mockSelectOnce(rows: unknown[]) {
  vi.mocked(db.select).mockReturnValueOnce({
    from: () => ({ where: () => ({ limit: () => Promise.resolve(rows) }) }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);
}

function mockTransactionPassthrough() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  vi.mocked(db.transaction).mockImplementation(async (fn: any) => fn(db));
  // À l'intérieur de la transaction : update (x2, sans returning) + insert token.
  vi.mocked(db.update).mockReturnValue({
    set: () => ({ where: () => Promise.resolve(undefined) }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);
  vi.mocked(db.insert).mockReturnValue({
    values: () => Promise.resolve(undefined),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);
}

const parcoursRefuse = {
  id: "p1",
  currentStep: Step.CHOIX_AMO,
  rgaSimulationData: null,
  rgaSimulationDataAgent: null,
  rgaSimulationDataAgentBaseline: null,
};
const validationRefusee = {
  id: "val-1",
  statut: StatutValidationAmo.LOGEMENT_NON_ELIGIBLE,
  entrepriseAmoId: "e1",
  userNom: "Test",
  userPrenom: "Jean",
  adresseLogement: "1 rue X",
};

describe("reouvrirDemandeRefusee", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("échoue si aucune validation AMO", async () => {
    mockSelectOnce([parcoursRefuse]); // parcours
    mockSelectOnce([]); // validation absente

    const res = await reouvrirDemandeRefusee({ parcoursId: "p1" });

    expect(res.success).toBe(false);
    expect(db.transaction).not.toHaveBeenCalled();
  });

  it("échoue si la demande n'est pas refusée", async () => {
    mockSelectOnce([parcoursRefuse]);
    mockSelectOnce([{ ...validationRefusee, statut: StatutValidationAmo.LOGEMENT_ELIGIBLE }]);

    const res = await reouvrirDemandeRefusee({ parcoursId: "p1" });

    expect(res.success).toBe(false);
    expect(db.transaction).not.toHaveBeenCalled();
  });

  it("échoue si l'étape n'est pas choix_amo", async () => {
    mockSelectOnce([{ ...parcoursRefuse, currentStep: Step.ELIGIBILITE }]);
    mockSelectOnce([validationRefusee]);

    const res = await reouvrirDemandeRefusee({ parcoursId: "p1" });

    expect(res.success).toBe(false);
    expect(db.transaction).not.toHaveBeenCalled();
  });

  it("remet la demande en attente (happy path, sans email)", async () => {
    mockSelectOnce([parcoursRefuse]); // parcours
    mockSelectOnce([validationRefusee]); // validation
    mockTransactionPassthrough();
    mockSelectOnce([{ nom: "ACME", emails: "a@b.fr" }]); // entreprise (post-transaction)

    const res = await reouvrirDemandeRefusee({ parcoursId: "p1", sendEmailToAmo: false });

    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.newToken).toBeTruthy();
      expect(res.data.emailSent).toBe(false);
    }
    expect(db.transaction).toHaveBeenCalledTimes(1);
    expect(db.insert).toHaveBeenCalledTimes(1); // token créé
  });
});
