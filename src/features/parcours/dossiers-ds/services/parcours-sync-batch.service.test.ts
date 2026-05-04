import { describe, it, expect, vi, beforeEach } from "vitest";
import { runSyncBatch } from "./parcours-sync-batch.service";
import { parcoursRepo, syncRunRepo } from "@/shared/database/repositories";
import { getAllDossiersByParcours } from "./dossier-ds.service";
import { syncDossierStatus } from "./ds-sync.service";
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
