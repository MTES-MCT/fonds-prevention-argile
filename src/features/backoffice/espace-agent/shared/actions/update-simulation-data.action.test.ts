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
  },
}));
vi.mock("../services/eligibilite-agent.service", () => ({
  evaluateAgentSimulation: vi.fn(),
  buildEligibiliteArchiveNote: vi.fn(() => "note-archivage"),
}));
vi.mock("@/features/auth/permissions/services/agent-scope.service", () => ({
  verifyProspectTerritoryAccess: vi.fn(async () => null),
}));

// db.select → ligne validation/parcours ; db.transaction(cb) → exécute cb avec un
// tx dont on capture les .update().set().
const txSetSpy = vi.fn(() => ({ where: vi.fn(async () => undefined) }));
const txUpdateSpy = vi.fn(() => ({ set: txSetSpy }));
vi.mock("@/shared/database/client", () => ({
  db: {
    select: vi.fn(),
    transaction: vi.fn(async (cb: (tx: unknown) => Promise<void>) => cb({ update: txUpdateSpy })),
  },
}));

import { updateSimulationDataAction } from "./update-simulation-data.action";
import { getCurrentAgent } from "@/features/backoffice/shared/actions/agent.actions";
import { db } from "@/shared/database/client";
import { evaluateAgentSimulation } from "../services/eligibilite-agent.service";
import { verifyProspectTerritoryAccess } from "@/features/auth/permissions/services/agent-scope.service";

const mockValidationRow = (statut: StatutValidationAmo, entrepriseAmoId: string | null = "amo-A") => {
  vi.mocked(db.select).mockReturnValue({
    from: vi.fn().mockReturnValue({
      innerJoin: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([
            {
              validation: { id: "validation-1", statut, entrepriseAmoId },
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

  it("bascule LOGEMENT_ELIGIBLE → LOGEMENT_NON_ELIGIBLE et archive (dans une transaction)", async () => {
    mockValidationRow(StatutValidationAmo.LOGEMENT_ELIGIBLE);
    vi.mocked(evaluateAgentSimulation).mockReturnValue({
      result: { eligible: false } as never,
      isEligible: false,
      isNonEligible: true,
    });

    const result = await updateSimulationDataAction("validation-1", rgaData);

    expect(result.success).toBe(true);
    expect(db.transaction).toHaveBeenCalledTimes(1);
    expect(txSetSpy).toHaveBeenCalledWith(
      expect.objectContaining({ statut: StatutValidationAmo.LOGEMENT_NON_ELIGIBLE })
    );
    expect(txSetSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        situationParticulier: SituationParticulier.ARCHIVE,
        archiveReason: "note-archivage",
        archivedBy: "agent-1",
      })
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
    expect(txSetSpy).toHaveBeenCalledWith(expect.objectContaining({ statut: StatutValidationAmo.LOGEMENT_ELIGIBLE }));
    expect(txSetSpy).toHaveBeenCalledWith(
      expect.objectContaining({ situationParticulier: SituationParticulier.PROSPECT, archivedAt: null })
    );
  });

  it("ne réécrit ni statut ni archivage quand le verdict est inchangé (reste éligible)", async () => {
    mockValidationRow(StatutValidationAmo.LOGEMENT_ELIGIBLE);
    vi.mocked(evaluateAgentSimulation).mockReturnValue({
      result: { eligible: true } as never,
      isEligible: true,
      isNonEligible: false,
    });

    const result = await updateSimulationDataAction("validation-1", rgaData);

    expect(result.success).toBe(true);
    // Seule l'écriture de simulation a lieu (pas de transition) → aucun set de statut.
    expect(txSetSpy).toHaveBeenCalledTimes(1);
    expect(txSetSpy).not.toHaveBeenCalledWith(expect.objectContaining({ statut: expect.anything() }));
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
    expect(txSetSpy).toHaveBeenCalledTimes(1);
    expect(txSetSpy).not.toHaveBeenCalledWith(expect.objectContaining({ statut: expect.anything() }));
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
    expect(txSetSpy).not.toHaveBeenCalledWith(expect.objectContaining({ statut: expect.anything() }));
  });
});

describe("updateSimulationDataAction — autorisation SANS_AMO (Aller-vers)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(evaluateAgentSimulation).mockReturnValue({
      result: null,
      isEligible: false,
      isNonEligible: false,
    });
    // Agent Aller-vers : pas d'entreprise AMO.
    vi.mocked(getCurrentAgent).mockResolvedValue({
      success: true,
      data: { id: "agent-av", role: UserRole.ALLERS_VERS, entrepriseAmoId: null, allersVersId: "av-1" },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
  });

  it("autorise l'écriture via l'accès territorial (dossier sans entreprise)", async () => {
    mockValidationRow(StatutValidationAmo.SANS_AMO, null);
    vi.mocked(verifyProspectTerritoryAccess).mockResolvedValue(null);

    const result = await updateSimulationDataAction("validation-1", rgaData);

    expect(result.success).toBe(true);
    expect(verifyProspectTerritoryAccess).toHaveBeenCalledWith(
      "parcours-1",
      expect.objectContaining({ role: UserRole.ALLERS_VERS, allersVersId: "av-1" })
    );
    expect(db.transaction).toHaveBeenCalledTimes(1);
  });

  it("refuse l'écriture hors territoire (aucune écriture)", async () => {
    mockValidationRow(StatutValidationAmo.SANS_AMO, null);
    vi.mocked(verifyProspectTerritoryAccess).mockResolvedValue("Ce prospect n'est pas dans votre territoire");

    const result = await updateSimulationDataAction("validation-1", rgaData);

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe("Ce prospect n'est pas dans votre territoire");
    expect(db.transaction).not.toHaveBeenCalled();
  });
});
