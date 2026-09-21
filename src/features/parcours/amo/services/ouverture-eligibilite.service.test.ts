import { describe, it, expect, vi, beforeEach } from "vitest";
import { ouvrirEligibiliteApresValidationAmo } from "./ouverture-eligibilite.service";
import { db } from "@/shared/database/client";
import { parcoursRepo } from "@/shared/database/repositories";
import { StatutValidationAmo } from "@/shared/domain/value-objects/statut-validation-amo.enum";

vi.mock("@/shared/database/client", () => ({
  db: { select: vi.fn() },
}));

vi.mock("@/shared/database/repositories", () => ({
  parcoursRepo: { advanceToEligibiliteFromChoixAmo: vi.fn() },
}));

/** Chaîne `db.select().from().where().limit()` renvoyant la validation du parcours. */
function mockValidation(statut: StatutValidationAmo | null) {
  const limit = vi.fn().mockResolvedValue(statut === null ? [] : [{ statut }]);
  vi.mocked(db.select).mockReturnValue({
    from: () => ({ where: () => ({ limit }) }),
  } as never);
}

describe("ouvrirEligibiliteApresValidationAmo", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(parcoursRepo.advanceToEligibiliteFromChoixAmo).mockResolvedValue(true);
  });

  it("ouvre l'étape éligibilité quand le logement est déclaré éligible", async () => {
    mockValidation(StatutValidationAmo.LOGEMENT_ELIGIBLE);

    await expect(ouvrirEligibiliteApresValidationAmo("parcours-1")).resolves.toBe(true);
    expect(parcoursRepo.advanceToEligibiliteFromChoixAmo).toHaveBeenCalledWith("parcours-1");
  });

  it("signale le no-op quand le parcours a déjà quitté l'étape de choix de l'AMO", async () => {
    mockValidation(StatutValidationAmo.LOGEMENT_ELIGIBLE);
    vi.mocked(parcoursRepo.advanceToEligibiliteFromChoixAmo).mockResolvedValue(false);

    await expect(ouvrirEligibiliteApresValidationAmo("parcours-1")).resolves.toBe(false);
  });

  it.each([
    StatutValidationAmo.EN_ATTENTE,
    StatutValidationAmo.SANS_AMO,
    StatutValidationAmo.LOGEMENT_NON_ELIGIBLE,
    StatutValidationAmo.ACCOMPAGNEMENT_REFUSE,
  ])("n'avance rien tant que le logement n'est pas déclaré éligible (%s)", async (statut) => {
    mockValidation(statut);

    await expect(ouvrirEligibiliteApresValidationAmo("parcours-1")).resolves.toBe(false);
    expect(parcoursRepo.advanceToEligibiliteFromChoixAmo).not.toHaveBeenCalled();
  });

  it("n'avance rien sur un parcours sans validation AMO", async () => {
    mockValidation(null);

    await expect(ouvrirEligibiliteApresValidationAmo("parcours-1")).resolves.toBe(false);
    expect(parcoursRepo.advanceToEligibiliteFromChoixAmo).not.toHaveBeenCalled();
  });
});
