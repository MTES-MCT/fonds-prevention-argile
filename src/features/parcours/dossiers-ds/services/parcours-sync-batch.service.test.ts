import { describe, it, expect, vi, beforeEach } from "vitest";
import { runSyncBatch } from "./parcours-sync-batch.service";
import { parcoursRepo, syncRunRepo } from "@/shared/database/repositories";
import { getAllDossiersByParcours } from "./dossier-ds.service";
import { recomputeParcoursStatus, syncDossierStatus } from "./ds-sync.service";
import { moveToNextStep } from "@/features/parcours/core/services";
import { Status } from "@/shared/domain/value-objects/status.enum";
import { Step } from "@/shared/domain/value-objects/step.enum";
import { DSStatus } from "@/shared/domain/value-objects/ds-status.enum";
import {
  SyncRunStatus,
  SyncRunTrigger,
} from "@/shared/domain/value-objects/sync-run-status.enum";

vi.mock("@/shared/database/repositories", () => ({
  parcoursRepo: {
    findActiveForSync: vi.fn(),
    findById: vi.fn(),
  },
  syncRunRepo: {
    createRun: vi.fn(),
    addEntry: vi.fn(),
    finalizeRun: vi.fn(),
  },
}));

vi.mock("./dossier-ds.service", () => ({
  getAllDossiersByParcours: vi.fn(),
  createDossierForCurrentStep: vi.fn(),
  getDossierByStep: vi.fn(),
  updateDossierStatus: vi.fn(),
}));

vi.mock("./ds-sync.service", () => ({
  syncDossierStatus: vi.fn(),
  syncAllDossiers: vi.fn(),
  recomputeParcoursStatus: vi.fn(),
}));

vi.mock("@/features/parcours/core/services", () => ({
  moveToNextStep: vi.fn(),
  validateCurrentStep: vi.fn(),
  getParcoursComplet: vi.fn(),
  createDiagnosticDossier: vi.fn(),
}));

const mockedParcoursRepo = vi.mocked(parcoursRepo);
const mockedSyncRunRepo = vi.mocked(syncRunRepo);
const mockedGetAllDossiers = vi.mocked(getAllDossiersByParcours);
const mockedSyncDossierStatus = vi.mocked(syncDossierStatus);
const mockedRecomputeStatus = vi.mocked(recomputeParcoursStatus);
const mockedMoveToNextStep = vi.mocked(moveToNextStep);

function fakeParcours(overrides: Partial<{
  id: string;
  userId: string;
  currentStep: Step;
  currentStatus: Status;
}> = {}) {
  return {
    id: "p1",
    userId: "u1",
    currentStep: Step.ELIGIBILITE,
    currentStatus: Status.EN_INSTRUCTION,
    archivedAt: null,
    completedAt: null,
    ...overrides,
  } as unknown as Awaited<ReturnType<typeof parcoursRepo.findById>>;
}

describe("runSyncBatch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedSyncRunRepo.createRun.mockResolvedValue({ id: "run-1" } as never);
    mockedSyncRunRepo.addEntry.mockResolvedValue({ id: "entry-1" } as never);
    mockedSyncRunRepo.finalizeRun.mockResolvedValue({ id: "run-1" } as never);
    // Par défaut : recompute ne change rien (les tests qui veulent simuler une transition
    // s'appuient sur les findById séquencés du parcours, pas sur cette valeur)
    mockedRecomputeStatus.mockResolvedValue({ success: true, data: { updated: false } } as never);
  });

  it("aucun parcours actif → status SUCCESS, pas d'entry", async () => {
    mockedParcoursRepo.findActiveForSync.mockResolvedValue([]);

    const result = await runSyncBatch(SyncRunTrigger.CRON);

    expect(result.status).toBe(SyncRunStatus.SUCCESS);
    expect(result.totalScanned).toBe(0);
    expect(result.totalUpdated).toBe(0);
    expect(mockedSyncRunRepo.addEntry).not.toHaveBeenCalled();
    expect(mockedSyncRunRepo.finalizeRun).toHaveBeenCalledWith("run-1", expect.objectContaining({
      status: SyncRunStatus.SUCCESS,
      totalParcoursScanned: 0,
    }));
  });

  it("parcours sans changement DS et sans progression → pas d'entry", async () => {
    const parcours = fakeParcours();
    mockedParcoursRepo.findActiveForSync.mockResolvedValue([parcours as never]);
    mockedParcoursRepo.findById.mockResolvedValue(parcours as never);
    mockedGetAllDossiers.mockResolvedValue([
      { id: "d1", step: Step.ELIGIBILITE, dsNumber: "123" } as never,
    ]);
    mockedSyncDossierStatus.mockResolvedValue({
      success: true,
      data: { updated: false, oldStatus: DSStatus.EN_INSTRUCTION, newStatus: DSStatus.EN_INSTRUCTION },
    } as never);

    const result = await runSyncBatch(SyncRunTrigger.CRON);

    expect(result.totalUpdated).toBe(0);
    expect(mockedSyncRunRepo.addEntry).not.toHaveBeenCalled();
    expect(mockedMoveToNextStep).not.toHaveBeenCalled();
    expect(result.status).toBe(SyncRunStatus.SUCCESS);
  });

  it("dossier passe à ACCEPTE + status VALIDE → entry + moveToNextStep + step_advanced", async () => {
    const before = fakeParcours({
      currentStep: Step.ELIGIBILITE,
      currentStatus: Status.EN_INSTRUCTION,
    });
    const afterSync = fakeParcours({
      currentStep: Step.ELIGIBILITE,
      currentStatus: Status.VALIDE,
    });
    const afterProgress = fakeParcours({
      currentStep: Step.DIAGNOSTIC,
      currentStatus: Status.TODO,
    });

    mockedParcoursRepo.findActiveForSync.mockResolvedValue([before as never]);
    // findById appelé 3x : avant sync, après sync, après progression
    mockedParcoursRepo.findById
      .mockResolvedValueOnce(before as never)
      .mockResolvedValueOnce(afterSync as never)
      .mockResolvedValueOnce(afterProgress as never);

    mockedGetAllDossiers.mockResolvedValue([
      { id: "d1", step: Step.ELIGIBILITE, dsNumber: "123" } as never,
    ]);
    mockedSyncDossierStatus.mockResolvedValue({
      success: true,
      data: { updated: true, oldStatus: DSStatus.EN_INSTRUCTION, newStatus: DSStatus.ACCEPTE },
    } as never);
    mockedMoveToNextStep.mockResolvedValue({
      success: true,
      data: { state: { step: Step.DIAGNOSTIC, status: Status.TODO }, complete: false },
    } as never);

    const result = await runSyncBatch(SyncRunTrigger.CRON);

    expect(mockedMoveToNextStep).toHaveBeenCalledWith("u1");
    expect(mockedSyncRunRepo.addEntry).toHaveBeenCalledTimes(1);
    const entry = mockedSyncRunRepo.addEntry.mock.calls[0][0];
    expect(entry.stepAdvanced).toBe(true);
    expect(entry.stepBefore).toBe(Step.ELIGIBILITE);
    expect(entry.stepAfter).toBe(Step.DIAGNOSTIC);
    expect(entry.statusBefore).toBe(Status.EN_INSTRUCTION);
    expect(entry.statusAfter).toBe(Status.TODO);
    expect(entry.dsStatusChanges).toEqual([
      { step: Step.ELIGIBILITE, oldDsStatus: DSStatus.EN_INSTRUCTION, newDsStatus: DSStatus.ACCEPTE },
    ]);
    expect(result.totalUpdated).toBe(1);
    expect(result.status).toBe(SyncRunStatus.SUCCESS);
  });

  it("parcours qui plante → entry avec error + status PARTIAL si d'autres réussissent", async () => {
    const ok = fakeParcours({ id: "p-ok", userId: "u-ok" });
    const ko = fakeParcours({ id: "p-ko", userId: "u-ko" });

    mockedParcoursRepo.findActiveForSync.mockResolvedValue([ok, ko] as never);
    mockedParcoursRepo.findById.mockImplementation(async (id: string) => {
      if (id === "p-ok") return ok as never;
      throw new Error("DB down");
    });
    mockedGetAllDossiers.mockResolvedValue([]);

    const result = await runSyncBatch(SyncRunTrigger.CRON);

    expect(result.totalErrors).toBe(1);
    expect(result.status).toBe(SyncRunStatus.PARTIAL);
    // 1 entry pour l'erreur (le parcours OK n'a aucun changement → pas d'entry)
    expect(mockedSyncRunRepo.addEntry).toHaveBeenCalledTimes(1);
    const errorEntry = mockedSyncRunRepo.addEntry.mock.calls[0][0];
    expect(errorEntry.parcoursId).toBe("p-ko");
    expect(errorEntry.error).toContain("DB down");
  });

  it("changement DS sans atteindre VALIDE → entry sans step_advanced", async () => {
    const before = fakeParcours({
      currentStep: Step.ELIGIBILITE,
      currentStatus: Status.TODO,
    });
    const afterSync = fakeParcours({
      currentStep: Step.ELIGIBILITE,
      currentStatus: Status.EN_INSTRUCTION,
    });

    mockedParcoursRepo.findActiveForSync.mockResolvedValue([before as never]);
    mockedParcoursRepo.findById
      .mockResolvedValueOnce(before as never)
      .mockResolvedValueOnce(afterSync as never);

    mockedGetAllDossiers.mockResolvedValue([
      { id: "d1", step: Step.ELIGIBILITE, dsNumber: "123" } as never,
    ]);
    mockedSyncDossierStatus.mockResolvedValue({
      success: true,
      data: { updated: true, oldStatus: DSStatus.EN_CONSTRUCTION, newStatus: DSStatus.EN_INSTRUCTION },
    } as never);

    const result = await runSyncBatch(SyncRunTrigger.CRON);

    expect(mockedMoveToNextStep).not.toHaveBeenCalled();
    expect(mockedSyncRunRepo.addEntry).toHaveBeenCalledTimes(1);
    const entry = mockedSyncRunRepo.addEntry.mock.calls[0][0];
    expect(entry.stepAdvanced).toBe(false);
    expect(entry.dsStatusChanges).toEqual([
      { step: Step.ELIGIBILITE, oldDsStatus: DSStatus.EN_CONSTRUCTION, newDsStatus: DSStatus.EN_INSTRUCTION },
    ]);
    expect(result.totalUpdated).toBe(1);
    expect(result.status).toBe(SyncRunStatus.SUCCESS);
  });

  it("dernière étape (FACTURES) qui devient VALIDE → pas de moveToNextStep", async () => {
    const before = fakeParcours({
      currentStep: Step.FACTURES,
      currentStatus: Status.EN_INSTRUCTION,
    });
    const afterSync = fakeParcours({
      currentStep: Step.FACTURES,
      currentStatus: Status.VALIDE,
    });

    mockedParcoursRepo.findActiveForSync.mockResolvedValue([before as never]);
    mockedParcoursRepo.findById
      .mockResolvedValueOnce(before as never)
      .mockResolvedValueOnce(afterSync as never);

    mockedGetAllDossiers.mockResolvedValue([
      { id: "df", step: Step.FACTURES, dsNumber: "999" } as never,
    ]);
    mockedSyncDossierStatus.mockResolvedValue({
      success: true,
      data: { updated: true, oldStatus: DSStatus.EN_INSTRUCTION, newStatus: DSStatus.ACCEPTE },
    } as never);

    const result = await runSyncBatch(SyncRunTrigger.CRON);

    expect(mockedMoveToNextStep).not.toHaveBeenCalled();
    expect(mockedSyncRunRepo.addEntry).toHaveBeenCalledTimes(1);
    const entry = mockedSyncRunRepo.addEntry.mock.calls[0][0];
    expect(entry.stepAdvanced).toBe(false);
    expect(entry.statusBefore).toBe(Status.EN_INSTRUCTION);
    expect(entry.statusAfter).toBe(Status.VALIDE);
    expect(result.status).toBe(SyncRunStatus.SUCCESS);
  });

  it("plusieurs dossiers : seul celui de current_step pilote current_status (via recomputeParcoursStatus)", async () => {
    // Scénario : current_step=eligibilite (EN_INSTRUCTION). Le dossier eligibilite passe
    // à ACCEPTE et un dossier diagnostic ouvert en avance passe de NON_ACCESSIBLE à
    // EN_CONSTRUCTION. Avant le refactor, le dernier dossier itéré écrasait current_status.
    // Maintenant, seul recomputeParcoursStatus (sur eligibilite) pilote current_status.
    const before = fakeParcours({
      currentStep: Step.ELIGIBILITE,
      currentStatus: Status.EN_INSTRUCTION,
    });
    const afterRecompute = fakeParcours({
      currentStep: Step.ELIGIBILITE,
      currentStatus: Status.VALIDE,
    });
    const afterProgress = fakeParcours({
      currentStep: Step.DIAGNOSTIC,
      currentStatus: Status.TODO,
    });

    mockedParcoursRepo.findActiveForSync.mockResolvedValue([before as never]);
    mockedParcoursRepo.findById
      .mockResolvedValueOnce(before as never) // début syncOneParcours
      .mockResolvedValueOnce(afterRecompute as never) // après recomputeParcoursStatus
      .mockResolvedValueOnce(afterProgress as never); // après moveToNextStep

    mockedGetAllDossiers.mockResolvedValue([
      { id: "d1", step: Step.ELIGIBILITE, dsNumber: "111" } as never,
      { id: "d2", step: Step.DIAGNOSTIC, dsNumber: "222" } as never,
    ]);

    mockedSyncDossierStatus.mockImplementation(async (_pid, step) => {
      if (step === Step.ELIGIBILITE) {
        return {
          success: true,
          data: { updated: true, oldStatus: DSStatus.EN_INSTRUCTION, newStatus: DSStatus.ACCEPTE },
        } as never;
      }
      return {
        success: true,
        data: { updated: true, oldStatus: DSStatus.NON_ACCESSIBLE, newStatus: DSStatus.EN_CONSTRUCTION },
      } as never;
    });

    mockedMoveToNextStep.mockResolvedValue({
      success: true,
      data: { state: { step: Step.DIAGNOSTIC, status: Status.TODO }, complete: false },
    } as never);

    const result = await runSyncBatch(SyncRunTrigger.CRON);

    // recomputeParcoursStatus appelé exactement 1 fois pour ce parcours
    expect(mockedRecomputeStatus).toHaveBeenCalledTimes(1);
    expect(mockedRecomputeStatus).toHaveBeenCalledWith("p1");

    // Les 2 dossiers sont synchronisés
    expect(mockedSyncDossierStatus).toHaveBeenCalledTimes(2);

    // moveToNextStep est bien appelé (current_status est passé à VALIDE après recompute)
    expect(mockedMoveToNextStep).toHaveBeenCalledWith("u1");

    // Une seule entry, qui reflète la transition eligibilite → diagnostic
    expect(mockedSyncRunRepo.addEntry).toHaveBeenCalledTimes(1);
    const entry = mockedSyncRunRepo.addEntry.mock.calls[0][0];
    expect(entry.stepBefore).toBe(Step.ELIGIBILITE);
    expect(entry.stepAfter).toBe(Step.DIAGNOSTIC);
    expect(entry.stepAdvanced).toBe(true);
    expect(entry.dsStatusChanges).toHaveLength(2);
    expect(result.status).toBe(SyncRunStatus.SUCCESS);
  });

  it("tous les parcours plantent → status ERROR", async () => {
    const ko1 = fakeParcours({ id: "p1" });
    const ko2 = fakeParcours({ id: "p2" });

    mockedParcoursRepo.findActiveForSync.mockResolvedValue([ko1, ko2] as never);
    mockedParcoursRepo.findById.mockRejectedValue(new Error("boom"));

    const result = await runSyncBatch(SyncRunTrigger.CRON);

    expect(result.totalErrors).toBe(2);
    expect(result.status).toBe(SyncRunStatus.ERROR);
  });
});
