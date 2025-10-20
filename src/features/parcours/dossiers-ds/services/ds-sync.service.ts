import { graphqlClient } from "../adapters/graphql/client";
import { getDossierByStep, updateDossierStatus } from "./dossier-ds.service";
import type { Step } from "../../core/domain/value-objects/step";
import {
  DSStatus,
  mapDSStatusToInternalStatus,
} from "../domain/value-objects/ds-status";
import { Status } from "../../core/domain/value-objects/status";
import { parcoursRepo } from "@/shared/database/repositories";
import type { ActionResult } from "@/shared/types";

/**
 * Service de synchronisation des statuts DS
 */

interface SyncResult {
  updated: boolean;
  oldStatus?: DSStatus;
  newStatus?: DSStatus;
}

/**
 * Synchronise le statut d'un dossier DS avec l'API
 */
export async function syncDossierStatus(
  parcoursId: string,
  step: Step,
  dsNumber: string
): Promise<ActionResult<SyncResult>> {
  try {
    // Récupérer le dossier local
    const localDossier = await getDossierByStep(parcoursId, step);

    if (!localDossier) {
      return {
        success: false,
        error: "Dossier local non trouvé",
      };
    }

    // Récupérer le statut depuis DS
    const dsStatus = await graphqlClient.getDossierStatus(Number(dsNumber));

    if (!dsStatus) {
      return {
        success: false,
        error: "Impossible de récupérer le statut DS",
      };
    }

    const newStatus = dsStatus as DSStatus;
    const oldStatus = localDossier.dsStatus as DSStatus;

    // Si le statut a changé, mettre à jour
    if (newStatus !== oldStatus) {
      await updateDossierStatus(localDossier.id, newStatus);

      // Mettre à jour le statut du parcours si nécessaire
      const internalStatus = mapDSStatusToInternalStatus(newStatus);
      await parcoursRepo.updateStatus(parcoursId, internalStatus);

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

/**
 * Synchronise tous les dossiers d'un parcours
 */
export async function syncAllDossiers(
  parcoursId: string,
  dossiers: Array<{ id: string; step: Step; dsNumber: string | null }>
): Promise<ActionResult<{ totalUpdated: number }>> {
  try {
    let totalUpdated = 0;

    for (const dossier of dossiers) {
      if (!dossier.dsNumber) continue;

      const result = await syncDossierStatus(
        parcoursId,
        dossier.step,
        dossier.dsNumber
      );

      if (result.success && result.data?.updated) {
        totalUpdated++;
      }
    }

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
