import { describe, it, expect, vi, beforeEach } from "vitest";
import { createDossierForCurrentStep } from "./dossier-ds.service";
import { db } from "@/shared/database/client";
import { dossiersDsTentativesRepo } from "@/shared/database/repositories";
import { ORIGINE_TENTATIVE } from "@/shared/database/schema";
import { Step } from "@/shared/domain/value-objects/step.enum";

vi.mock("@/shared/database/client", () => ({ db: { transaction: vi.fn() } }));

vi.mock("@/shared/database/repositories", () => ({
  dossiersDsTentativesRepo: { record: vi.fn() },
}));

vi.mock("@/shared/email/brevo", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/shared/email/brevo")>()),
  emitBrevoEvent: vi.fn(),
}));

const params = {
  dsNumber: "32052358",
  dsDemarcheId: "126061",
  dsUrl: "https://dn.example/commencer/uuid?prefill_token=secret",
  dsId: "RG9zc2llci0x",
};

/** Transaction factice : rend la ligne insérée et laisse observer les appels au registre. */
function mockTransaction() {
  const tx = {
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ id: "dossier-1" }]),
      }),
    }),
  };
  vi.mocked(db.transaction).mockImplementation(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (async (cb: any) => cb(tx)) as any
  );
  return tx;
}

// Cf. ADR-0027 : un pointeur sans tentative connue perdrait le numéro au premier remplacement.
describe("createDossierForCurrentStep — registre des tentatives", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(dossiersDsTentativesRepo.record).mockResolvedValue(undefined);
  });

  it("enregistre la tentative avec le pointeur, dans la même transaction", async () => {
    const tx = mockTransaction();

    const result = await createDossierForCurrentStep("user-1", "parcours-1", Step.ELIGIBILITE, params);

    expect(result.success).toBe(true);
    expect(dossiersDsTentativesRepo.record).toHaveBeenCalledWith(
      expect.objectContaining({
        parcoursId: "parcours-1",
        step: Step.ELIGIBILITE,
        dsNumber: "32052358",
        origine: ORIGINE_TENTATIVE.PREFILL,
        dsId: "RG9zc2llci0x",
      }),
      tx
    );
  });

  it("échoue sans créer de pointeur si le registre ne peut pas être écrit", async () => {
    mockTransaction();
    vi.mocked(dossiersDsTentativesRepo.record).mockRejectedValue(new Error("boom"));

    const result = await createDossierForCurrentStep("user-1", "parcours-1", Step.ELIGIBILITE, params);

    expect(result.success).toBe(false);
  });
});
