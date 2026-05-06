import { graphqlClient } from "../adapters/graphql/client";
import { getDossierByStep, updateDossierStatus } from "./dossier-ds.service";
import type { Step } from "../../core/domain/value-objects/step";
import { DS_TO_INTERNAL_STATUS, DSStatus } from "../domain/value-objects/ds-status";
import { parcoursRepo } from "@/shared/database/repositories";
import type { ActionResult } from "@/shared/types";
import type { Status } from "@/shared/domain/value-objects/status.enum";

/**
 * Service de synchronisation des statuts DS.
 *
 * Doc de référence : `docs/parcours/FLOW-AND-SYNC.md` (§3 Architecture sync).
 *
 * Règle d'or : tout appel à `syncDossierStatus` doit être suivi d'un
 * `recomputeParcoursStatus` (manuel ou via `syncAllDossiers`).
 */

interface SyncResult {
  updated: boolean;
  oldStatus?: DSStatus;
  newStatus?: DSStatus;
}

/**
 * Synchronise le statut d'un dossier DS avec l'API.
 * NE met PAS à jour `parcours.current_status` — appeler `recomputeParcoursStatus` ensuite.
 */
export async function syncDossierStatus(
  parcoursId: string,
  step: Step,
  dsNumber: string
): Promise<ActionResult<SyncResult>> {
  try {
    const localDossier = await getDossierByStep(parcoursId, step);

    if (!localDossier) {
      return {
        success: false,
        error: "Dossier local non trouvé",
      };
    }

    const dsStatus = await graphqlClient.getDossierStatus(Number(dsNumber));

    if (!dsStatus) {
      return {
        success: false,
        error: "Impossible de récupérer le statut DS",
      };
    }

    const newStatus = dsStatus as DSStatus;
    const oldStatus = localDossier.dsStatus as DSStatus;

    if (newStatus !== oldStatus) {
      await updateDossierStatus(localDossier.id, newStatus);

      return {
        success: true,
        data: {
          updated: true,
          oldStatus,
          newStatus,
        },
      };
    }

    return {
      success: true,
      data: {
        updated: false,
        oldStatus,
        newStatus: oldStatus,
      },
    };
  } catch (error) {
    console.error("Erreur syncDossierStatus:", error);
    return {
      success: false,
      error: "Erreur lors de la synchronisation",
    };
  }
}

interface RecomputeResult {
  updated: boolean;
  oldStatus?: Status;
  newStatus?: Status;
}

/**
 * Recalcule `parcours.current_status` à partir du dossier de l'étape courante.
 *
 * Règles :
 * - Si l'étape courante n'a pas de dossier DS (ex : choix_amo), ne rien faire :
 *   le `current_status` est piloté par d'autres mécanismes (validation AMO).
 * - Sinon, mappe le `ds_status` du dossier courant vers un statut interne et
 *   écrit en BDD si différent du `current_status` actuel.
 */
export async function recomputeParcoursStatus(parcoursId: string): Promise<ActionResult<RecomputeResult>> {
  try {
    const parcours = await parcoursRepo.findById(parcoursId);
    if (!parcours) {
      return { success: false, error: "Parcours non trouvé" };
    }

    const currentDossier = await getDossierByStep(parcoursId, parcours.currentStep);
    if (!currentDossier) {
      return { success: true, data: { updated: false } };
    }

    const expected = DS_TO_INTERNAL_STATUS[currentDossier.dsStatus as DSStatus];
    if (expected === parcours.currentStatus) {
      return {
        success: true,
        data: { updated: false, oldStatus: parcours.currentStatus, newStatus: expected },
      };
    }

    await parcoursRepo.updateStatus(parcoursId, expected);
    return {
      success: true,
      data: { updated: true, oldStatus: parcours.currentStatus, newStatus: expected },
    };
  } catch (error) {
    console.error("Erreur recomputeParcoursStatus:", error);
    return { success: false, error: "Erreur lors du recalcul du statut" };
  }
}

/**
 * Synchronise tous les dossiers d'un parcours puis recalcule son `current_status`.
 */
export async function syncAllDossiers(
  parcoursId: string,
  dossiers: Array<{ id: string; step: Step; dsNumber: string | null }>
): Promise<ActionResult<{ totalUpdated: number }>> {
  try {
    let totalUpdated = 0;

    for (const dossier of dossiers) {
      if (!dossier.dsNumber) continue;

      const result = await syncDossierStatus(parcoursId, dossier.step, dossier.dsNumber);

      if (result.success && result.data?.updated) {
        totalUpdated++;
      }
    }

    // Recalcule une seule fois à la fin, sur la base du dossier de current_step.
    await recomputeParcoursStatus(parcoursId);

    return {
      success: true,
      data: { totalUpdated },
    };
  } catch (error) {
    console.error("Erreur syncAllDossiers:", error);
    return {
      success: false,
      error: "Erreur lors de la synchronisation complète",
    };
  }
}
