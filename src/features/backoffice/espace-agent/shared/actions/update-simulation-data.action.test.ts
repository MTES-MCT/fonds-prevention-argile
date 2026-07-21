import { describe, it, expect, vi, beforeEach } from "vitest";
import { StatutValidationAmo } from "@/shared/domain/value-objects/statut-validation-amo.enum";
import { SituationParticulier } from "@/shared/domain/value-objects/situation-particulier.enum";
import { UserRole } from "@/shared/domain/value-objects";
import type { RGASimulationData } from "@/shared/domain/types/rga-simulation.types";

vi.mock("@/features/backoffice/shared/actions/super-admin-access", () => ({
  assertNotSuperAdminReadOnly: vi.fn(async () => null),
}));
vi.mock("@/features/backoffice/shared/actions/agent.actions", () => ({
  getCurrentAgent: vi.fn(),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/shared/database/repositories/parcours-prevention.repository", () => ({
  parcoursPreventionRepository: {
    updateRGADataAgent: vi.fn(async () => ({ id: "parcours-1" })),
    updateSituationParticulier: vi.fn(async () => ({ id: "parcours-1" })),
  },
}));
vi.mock("../services/eligibilite-agent.service", () => ({
  evaluateAgentSimulation: vi.fn(),
  buildEligibiliteArchiveNote: vi.fn(() => "note-archivage"),
}));

// db.select → renvoie une ligne validation/parcours ; db.update → capture le .set().
const updateSetSpy = vi.fn(() => ({ where: vi.fn(async () => undefined) }));
vi.mock("@/shared/database/client", () => ({
  db: {
    select: vi.fn(),
    update: vi.fn(() => ({ set: updateSetSpy })),
  },
}));

import { updateSimulationDataAction } from "./update-simulation-data.action";
import { getCurrentAgent } from "@/features/backoffice/shared/actions/agent.actions";
import { db } from "@/shared/database/client";
import { parcoursPreventionRepository } from "@/shared/database/repositories/parcours-prevention.repository";
import { evaluateAgentSimulation } from "../services/eligibilite-agent.service";

const mockValidationRow = (statut: StatutValidationAmo) => {
  vi.mocked(db.select).mockReturnValue({
    from: vi.fn().mockReturnValue({
      innerJoin: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([
            {
              validation: { id: "validation-1", statut, entrepriseAmoId: "amo-A" },
              parcours: { id: "parcours-1" },
            },
          ]),
        }),
      }),
    }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);
};

const rgaData = { logement: { adresse: "X" } } as unknown as RGASimulationData;

describe("updateSimulationDataAction — recalcul du statut d'éligibilité", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getCurrentAgent).mockResolvedValue({
      success: true,
      data: { id: "agent-1", role: UserRole.AMO, entrepriseAmoId: "amo-A", allersVersId: null },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
  });

  it("bascule LOGEMENT_ELIGIBLE → LOGEMENT_NON_ELIGIBLE et archive", async () => {
    mockValidationRow(StatutValidationAmo.LOGEMENT_ELIGIBLE);
    vi.mocked(evaluateAgentSimulation).mockReturnValue({
      result: { eligible: false } as never,
      isEligible: false,
      isNonEligible: true,
    });

    const result = await updateSimulationDataAction("validation-1", rgaData);

    expect(result.success).toBe(true);
    expect(updateSetSpy).toHaveBeenCalledWith(
      expect.objectContaining({ statut: StatutValidationAmo.LOGEMENT_NON_ELIGIBLE })
    );
    expect(parcoursPreventionRepository.updateSituationParticulier).toHaveBeenCalledWith(
      "parcours-1",
      SituationParticulier.ARCHIVE,
      "note-archivage",
      "agent-1"
    );
  });

  it("bascule LOGEMENT_NON_ELIGIBLE → LOGEMENT_ELIGIBLE et dé-archive", async () => {
    mockValidationRow(StatutValidationAmo.LOGEMENT_NON_ELIGIBLE);
    vi.mocked(evaluateAgentSimulation).mockReturnValue({
      result: { eligible: true } as never,
      isEligible: true,
      isNonEligible: false,
    });

    const result = await updateSimulationDataAction("validation-1", rgaData);

    expect(result.success).toBe(true);
    expect(updateSetSpy).toHaveBeenCalledWith(
      expect.objectContaining({ statut: StatutValidationAmo.LOGEMENT_ELIGIBLE })
    );
    expect(parcoursPreventionRepository.updateSituationParticulier).toHaveBeenCalledWith(
      "parcours-1",
      SituationParticulier.PROSPECT
    );
  });

  it("ne touche pas au statut d'un dossier EN_ATTENTE (validation AMO à venir)", async () => {
    mockValidationRow(StatutValidationAmo.EN_ATTENTE);
    vi.mocked(evaluateAgentSimulation).mockReturnValue({
      result: { eligible: false } as never,
      isEligible: false,
      isNonEligible: true,
    });

    const result = await updateSimulationDataAction("validation-1", rgaData);

    expect(result.success).toBe(true);
    expect(db.update).not.toHaveBeenCalled();
    expect(parcoursPreventionRepository.updateSituationParticulier).not.toHaveBeenCalled();
  });

  it("ne touche pas au statut d'un dossier SANS_AMO", async () => {
    mockValidationRow(StatutValidationAmo.SANS_AMO);
    vi.mocked(evaluateAgentSimulation).mockReturnValue({
      result: { eligible: false } as never,
      isEligible: false,
      isNonEligible: true,
    });

    const result = await updateSimulationDataAction("validation-1", rgaData);

    expect(result.success).toBe(true);
    expect(db.update).not.toHaveBeenCalled();
  });
});
