import { describe, it, expect, vi, beforeEach } from "vitest";
import { syncUserDossierStatus, syncAllUserDossiers } from "./dossier-sync.actions";
import { getSession } from "@/features/auth/server";
import { recomputeParcoursStatus, syncDossierStatus, syncAllDossiers } from "../services/ds-sync.service";
import { getDossierByStep, getAllDossiersByParcours } from "../services/dossier-ds.service";
import { getParcoursComplet, moveToNextStep } from "../../core/services";
import { parcoursRepo } from "@/shared/database/repositories";
import { Step } from "@/shared/domain/value-objects/step.enum";
import { Status } from "@/shared/domain/value-objects/status.enum";
import { DSStatus } from "@/shared/domain/value-objects/ds-status.enum";

vi.mock("@/features/auth/server", () => ({ getSession: vi.fn() }));
vi.mock("../services/ds-sync.service", () => ({
  syncDossierStatus: vi.fn(),
  syncAllDossiers: vi.fn(),
  recomputeParcoursStatus: vi.fn(),
}));
vi.mock("../services/dossier-ds.service", () => ({
  getDossierByStep: vi.fn(),
  getAllDossiersByParcours: vi.fn(),
}));
vi.mock("@/shared/database/repositories", () => ({ parcoursRepo: { findById: vi.fn() } }));
vi.mock("../../core/services", () => ({
  getParcoursComplet: vi.fn(),
  moveToNextStep: vi.fn(),
}));

const mockedSyncDossierStatus = vi.mocked(syncDossierStatus);
const mockedSyncAllDossiers = vi.mocked(syncAllDossiers);
const mockedMoveToNextStep = vi.mocked(moveToNextStep);

const ECHEC_DN = { success: false as const, error: "Dossier 123 : écriture du statut classe_sans_suite échouée" };

describe("dossier-sync.actions — pas de progression sur une étape que DN n'a pas confirmée", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getSession).mockResolvedValue({ userId: "u1" } as never);
    vi.mocked(getParcoursComplet).mockResolvedValue({
      parcours: { id: "p1", currentStep: Step.ELIGIBILITE, currentStatus: Status.VALIDE },
    } as never);
    vi.mocked(getDossierByStep).mockResolvedValue({ id: "d1", dsNumber: "123", dsStatus: DSStatus.ACCEPTE } as never);
    vi.mocked(getAllDossiersByParcours).mockResolvedValue([
      { id: "d1", step: Step.ELIGIBILITE, dsNumber: "123" },
    ] as never);
    vi.mocked(parcoursRepo.findById).mockResolvedValue({ id: "p1", currentStep: Step.ELIGIBILITE } as never);
    vi.mocked(recomputeParcoursStatus).mockResolvedValue({ success: true, data: { updated: false } });
    mockedMoveToNextStep.mockResolvedValue({
      success: true,
      data: { state: { step: Step.DIAGNOSTIC, status: Status.TODO }, complete: false },
    } as never);
  });

  it("syncUserDossierStatus n'avance pas quand la relecture de l'étape courante échoue", async () => {
    mockedSyncDossierStatus.mockResolvedValue(ECHEC_DN);

    const result = await syncUserDossierStatus(Step.ELIGIBILITE);

    expect(result.success).toBe(false);
    expect(mockedMoveToNextStep).not.toHaveBeenCalled();
  });

  it("syncUserDossierStatus avance quand l'échec porte sur une autre étape", async () => {
    mockedSyncDossierStatus.mockResolvedValue(ECHEC_DN);

    const result = await syncUserDossierStatus(Step.DIAGNOSTIC);

    expect(result.success).toBe(false);
    expect(mockedMoveToNextStep).toHaveBeenCalledWith("u1");
  });

  it("syncAllUserDossiers remonte les échecs et n'avance pas sur l'étape courante en erreur", async () => {
    mockedSyncAllDossiers.mockResolvedValue({
      success: true,
      data: { totalUpdated: 1, etapesEnErreur: [Step.ELIGIBILITE] },
    });

    const result = await syncAllUserDossiers();

    expect(result).toEqual({ success: true, data: { totalUpdated: 1, totalErreurs: 1, stepAdvanced: false } });
    expect(mockedMoveToNextStep).not.toHaveBeenCalled();
  });

  it("syncAllUserDossiers avance quand seule une étape passée est en erreur", async () => {
    mockedSyncAllDossiers.mockResolvedValue({
      success: true,
      data: { totalUpdated: 0, etapesEnErreur: [Step.CHOIX_AMO] },
    });

    const result = await syncAllUserDossiers();

    expect(result).toEqual({ success: true, data: { totalUpdated: 0, totalErreurs: 1, stepAdvanced: true } });
  });

  it.each([
    ["syncUserDossierStatus", () => syncUserDossierStatus(Step.ELIGIBILITE)],
    ["syncAllUserDossiers", () => syncAllUserDossiers()],
  ])("%s n'avance pas quand l'étape a changé pendant la synchro", async (_nom, appel) => {
    mockedSyncDossierStatus.mockResolvedValue({ success: true, data: { updated: false } });
    mockedSyncAllDossiers.mockResolvedValue({ success: true, data: { totalUpdated: 0, etapesEnErreur: [] } });
    vi.mocked(parcoursRepo.findById).mockResolvedValue({ id: "p1", currentStep: Step.DIAGNOSTIC } as never);

    await appel();

    expect(mockedMoveToNextStep).not.toHaveBeenCalled();
  });
});
