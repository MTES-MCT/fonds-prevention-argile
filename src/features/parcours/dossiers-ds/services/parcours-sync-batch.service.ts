import { parcoursRepo, syncRunRepo } from "@/shared/database/repositories";
import { SyncRunStatus, SyncRunTrigger } from "@/shared/domain/value-objects/sync-run-status.enum";
import { Status } from "@/shared/domain/value-objects/status.enum";
import type { Step } from "@/shared/domain/value-objects/step.enum";
import { DSStatus } from "@/shared/domain/value-objects/ds-status.enum";
import { moveToNextStep } from "@/features/parcours/core/services";
import type { DsStatusChange } from "@/shared/database/schema/sync-run-entries";
import { getAllDossiersByParcours } from "./dossier-ds.service";
import { recomputeParcoursStatus, syncDossierStatus } from "./ds-sync.service";

/**
 * Synchronisation batch des parcours (CRON et déclenchement manuel super-admin).
 *
 * Doc de référence : `docs/parcours/FLOW-AND-SYNC.md` (§4 CRON et historique).
 *
 * Pour chaque parcours actif :
 * 1. Sync de tous ses dossiers DS (mise à jour de `ds_status`)
 * 2. Recompute du `current_status` à partir du dossier de `current_step`
 * 3. Progression auto (`moveToNextStep`) si VALIDE et pas dernière étape
 * 4. Trace des changements dans `sync_run_entries`
 */

export type SyncRunResult =
  | {
      skipped: false;
      runId: string;
      status: SyncRunStatus;
      totalScanned: number;
      totalUpdated: number;
      totalErrors: number;
    }
  | {
      skipped: true;
      reason: string;
      existingRunId: string;
    };

const SLEEP_BETWEEN_PARCOURS_MS = 150;

/**
 * Au-delà de ce seuil, un run encore "pending" (finished_at IS NULL) est considéré
 * comme zombie : on le finalise en `error` et on lance un nouveau run.
 * Doit être > maxDuration de la route /api/cron/sync-parcours (5 min) avec marge.
 */
const STALE_RUN_THRESHOLD_MS = 30 * 60 * 1000; // 30 min

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function runSyncBatch(triggeredBy: SyncRunTrigger): Promise<SyncRunResult> {
  // Verrou anti-runs concurrents : si un run est déjà en cours, on skip
  // (ou on l'expire et on continue s'il est zombie).
  const pending = await syncRunRepo.findPendingRun();
  if (pending) {
    const ageMs = Date.now() - new Date(pending.startedAt).getTime();
    if (ageMs < STALE_RUN_THRESHOLD_MS) {
      return {
        skipped: true,
        reason: `Un run est déjà en cours (${pending.id}), démarré il y a ${Math.round(ageMs / 1000)}s.`,
        existingRunId: pending.id,
      };
    }
    // Run zombie : on le finalise en erreur et on continue
    await syncRunRepo.finalizeRun(pending.id, {
      status: SyncRunStatus.ERROR,
      totalParcoursScanned: pending.totalParcoursScanned,
      totalParcoursUpdated: pending.totalParcoursUpdated,
      totalErrors: pending.totalErrors,
      errorSummary: `Run zombie auto-expiré après ${Math.round(ageMs / 60000)} min sans finished_at.`,
    });
  }

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
      const hadErrors = result.errors.length > 0;

      if (changedSomething || hadErrors) {
        await syncRunRepo.addEntry({
          syncRunId: run.id,
          parcoursId: parcours.id,
          stepBefore: result.stepBefore,
          stepAfter: result.stepAfter,
          statusBefore: result.statusBefore,
          statusAfter: result.statusAfter,
          dsStatusChanges: result.dsChanges,
          stepAdvanced: result.stepAdvanced,
          error: hadErrors ? result.errors.join(" | ") : undefined,
        });
        if (changedSomething) totalUpdated++;
      }

      if (hadErrors) {
        totalErrors++;
        errorMessages.push(`parcours ${parcours.id}: ${result.errors.join(" | ")}`);
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
    skipped: false,
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
  errors: string[];
}

async function syncOneParcours(parcoursId: string, userId: string): Promise<SyncOneResult> {
  const before = await parcoursRepo.findById(parcoursId);
  if (!before) {
    throw new Error("Parcours introuvable");
  }

  const dossiers = await getAllDossiersByParcours(parcoursId);
  const dsChanges: DsStatusChange[] = [];
  const dossierErrors: string[] = [];

  // 1. Synchronise tous les dossiers (sans toucher au current_status du parcours).
  //    On garde tous les dossiers en sync DS pour rester cohérent côté historique,
  //    même si seul celui de current_step pilote le current_status.
  for (const dossier of dossiers) {
    if (!dossier.dsNumber) continue;

    const result = await syncDossierStatus(parcoursId, dossier.step, dossier.dsNumber);
    if (result.success && result.data?.updated && result.data.oldStatus && result.data.newStatus) {
      dsChanges.push({
        step: dossier.step,
        oldDsStatus: result.data.oldStatus as DSStatus,
        newDsStatus: result.data.newStatus as DSStatus,
      });
    } else if (!result.success) {
      // Échec de sync d'un dossier (ex: unauthorized côté DS) : on le collecte au lieu
      // de l'ignorer silencieusement, pour le tracer dans l'historique du run.
      dossierErrors.push(`${dossier.step}: ${result.error}`);
    }
  }

  // 2. Recalcule current_status à partir du dossier de current_step uniquement.
  await recomputeParcoursStatus(parcoursId);

  // 3. Relire pour avoir le current_status à jour
  const afterSync = await parcoursRepo.findById(parcoursId);
  if (!afterSync) {
    throw new Error("Parcours disparu pendant la synchro");
  }

  // Si le statut courant est VALIDE, on appelle moveToNextStep dans tous les cas :
  // - étape non finale → progression vers l'étape suivante (TODO)
  // - étape finale (factures) → markAsCompleted en interne, sort le parcours
  //   de findActiveForSync au prochain run.
  let stepAdvanced = false;
  let final = afterSync;
  if (afterSync.currentStatus === Status.VALIDE) {
    const progression = await moveToNextStep(userId);
    if (progression.success && !progression.data.complete) {
      stepAdvanced = true;
    }
    // Re-lecture seulement si on a appelé moveToNextStep (qui modifie potentiellement
    // currentStep, currentStatus, et/ou completedAt).
    const refreshed = await parcoursRepo.findById(parcoursId);
    if (!refreshed) {
      throw new Error("Parcours disparu après progression");
    }
    final = refreshed;
  }

  return {
    stepBefore: before.currentStep,
    stepAfter: final.currentStep,
    statusBefore: before.currentStatus,
    statusAfter: final.currentStatus,
    dsChanges,
    stepAdvanced,
    errors: dossierErrors,
  };
}
