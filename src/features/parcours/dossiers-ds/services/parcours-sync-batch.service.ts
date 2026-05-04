import { parcoursRepo, syncRunRepo } from "@/shared/database/repositories";
import { SyncRunStatus, SyncRunTrigger } from "@/shared/domain/value-objects/sync-run-status.enum";
import { Status } from "@/shared/domain/value-objects/status.enum";
import type { Step } from "@/shared/domain/value-objects/step.enum";
import { isLastStep } from "@/features/parcours/core/domain/value-objects/step";
import { DSStatus } from "@/shared/domain/value-objects/ds-status.enum";
import { moveToNextStep } from "@/features/parcours/core/services";
import type { DsStatusChange } from "@/shared/database/schema/sync-run-entries";
import { getAllDossiersByParcours } from "./dossier-ds.service";
import { syncDossierStatus } from "./ds-sync.service";

/**
 * Synchronisation batch des parcours :
 * - itère tous les parcours actifs (non archivés / non complétés)
 * - synchronise leurs dossiers DS
 * - fait progresser le parcours vers l'étape suivante si le statut interne devient VALIDE
 * - enregistre l'historique dans sync_runs / sync_run_entries
 */

export interface SyncRunResult {
  runId: string;
  status: SyncRunStatus;
  totalScanned: number;
  totalUpdated: number;
  totalErrors: number;
}

const SLEEP_BETWEEN_PARCOURS_MS = 150;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function runSyncBatch(triggeredBy: SyncRunTrigger): Promise<SyncRunResult> {
  const run = await syncRunRepo.createRun(triggeredBy);

  const parcoursList = await parcoursRepo.findActiveForSync();

  let totalUpdated = 0;
  let totalErrors = 0;
  const errorMessages: string[] = [];

  for (const parcours of parcoursList) {
    try {
      const result = await syncOneParcours(parcours.id, parcours.userId);

      const changedSomething =
        result.dsChanges.length > 0 ||
        result.stepAdvanced ||
        result.statusBefore !== result.statusAfter ||
        result.stepBefore !== result.stepAfter;

      if (changedSomething) {
        await syncRunRepo.addEntry({
          syncRunId: run.id,
          parcoursId: parcours.id,
          stepBefore: result.stepBefore,
          stepAfter: result.stepAfter,
          statusBefore: result.statusBefore,
          statusAfter: result.statusAfter,
          dsStatusChanges: result.dsChanges,
          stepAdvanced: result.stepAdvanced,
        });
        totalUpdated++;
      }
    } catch (error) {
      totalErrors++;
      const message = error instanceof Error ? error.message : String(error);
      errorMessages.push(`parcours ${parcours.id}: ${message}`);
      try {
        await syncRunRepo.addEntry({
          syncRunId: run.id,
          parcoursId: parcours.id,
          stepBefore: parcours.currentStep,
          stepAfter: parcours.currentStep,
          statusBefore: parcours.currentStatus,
          statusAfter: parcours.currentStatus,
          dsStatusChanges: [],
          stepAdvanced: false,
          error: message,
        });
      } catch (logError) {
        console.error("Impossible d'enregistrer l'erreur de sync:", logError);
      }
    }

    if (parcoursList.length > 1) {
      await sleep(SLEEP_BETWEEN_PARCOURS_MS);
    }
  }

  // Détermination du statut final
  let status: SyncRunStatus;
  if (totalErrors === 0) {
    status = SyncRunStatus.SUCCESS;
  } else if (totalErrors === parcoursList.length && parcoursList.length > 0) {
    status = SyncRunStatus.ERROR;
  } else {
    status = SyncRunStatus.PARTIAL;
  }

  await syncRunRepo.finalizeRun(run.id, {
    status,
    totalParcoursScanned: parcoursList.length,
    totalParcoursUpdated: totalUpdated,
    totalErrors,
    errorSummary: errorMessages.length > 0 ? errorMessages.slice(0, 20).join("\n") : null,
  });

  return {
    runId: run.id,
    status,
    totalScanned: parcoursList.length,
    totalUpdated,
    totalErrors,
  };
}

interface SyncOneResult {
  stepBefore: Step;
  stepAfter: Step;
  statusBefore: Status;
  statusAfter: Status;
  dsChanges: DsStatusChange[];
  stepAdvanced: boolean;
}

async function syncOneParcours(parcoursId: string, userId: string): Promise<SyncOneResult> {
  const before = await parcoursRepo.findById(parcoursId);
  if (!before) {
    throw new Error("Parcours introuvable");
  }

  const dossiers = await getAllDossiersByParcours(parcoursId);
  const dsChanges: DsStatusChange[] = [];

  for (const dossier of dossiers) {
    if (!dossier.dsNumber) continue;

    const result = await syncDossierStatus(parcoursId, dossier.step, dossier.dsNumber);
    if (result.success && result.data?.updated && result.data.oldStatus && result.data.newStatus) {
      dsChanges.push({
        step: dossier.step,
        oldDsStatus: result.data.oldStatus as DSStatus,
        newDsStatus: result.data.newStatus as DSStatus,
      });
    }
  }

  // Relire pour avoir le current_status à jour (la sync l'a possiblement modifié)
  const afterSync = await parcoursRepo.findById(parcoursId);
  if (!afterSync) {
    throw new Error("Parcours disparu pendant la synchro");
  }

  let stepAdvanced = false;
  if (afterSync.currentStatus === Status.VALIDE && !isLastStep(afterSync.currentStep)) {
    const progression = await moveToNextStep(userId);
    if (progression.success && !progression.data.complete) {
      stepAdvanced = true;
    }
  }

  const final = stepAdvanced ? await parcoursRepo.findById(parcoursId) : afterSync;
  if (!final) {
    throw new Error("Parcours disparu après progression");
  }

  return {
    stepBefore: before.currentStep,
    stepAfter: final.currentStep,
    statusBefore: before.currentStatus,
    statusAfter: final.currentStatus,
    dsChanges,
    stepAdvanced,
  };
}
