"use server";

import { getSession } from "@/features/auth/server";
import {
  syncDossierStatus,
  syncAllDossiers,
} from "../services/ds-sync.service";
import {
  getDossierByStep,
  getAllDossiersByParcours,
} from "../services/dossier-ds.service";
import { DSStatus } from "../domain/value-objects/ds-status";
import type { Step } from "../../core/domain/value-objects/step";
import type { ActionResult } from "@/shared/types";

/**
 * Actions de synchronisation des statuts DS
 */

interface SyncResult {
  updated: boolean;
  oldStatus?: string;
  newStatus?: string;
}

/**
 * Synchronise le statut du dossier pour une étape donnée
 */
export async function syncUserDossierStatus(
  step: Step
): Promise<ActionResult<SyncResult>> {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return {
        success: false,
        error: "Non connecté",
      };
    }

    const parcours = await getParcoursComplet(session.userId);
    if (!parcours) {
      return {
        success: false,
        error: "Parcours non trouvé",
      };
    }

    // Récupérer le dossier
    const dossier = await getDossierByStep(parcours.parcours.id, step);

    if (!dossier) {
      return {
        success: true,
        data: {
          updated: false,
          oldStatus: DSStatus.NON_ACCESSIBLE,
          newStatus: DSStatus.NON_ACCESSIBLE,
        },
      };
    }

    if (!dossier.dsNumber) {
      return {
        success: true,
        data: {
          updated: false,
          oldStatus: dossier.dsStatus,
          newStatus: dossier.dsStatus,
        },
      };
    }

    // Synchroniser
    const syncResult = await syncDossierStatus(
      parcours.parcours.id,
      step,
      dossier.dsNumber
    );

    return syncResult;
  } catch (error) {
    console.error("Erreur syncUserDossierStatus:", error);
    return {
      success: false,
      error: "Erreur lors de la synchronisation",
    };
  }
}

/**
 * Synchronise tous les dossiers de l'utilisateur
 */
export async function syncAllUserDossiers(): Promise<
  ActionResult<{ totalUpdated: number }>
> {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return {
        success: false,
        error: "Non connecté",
      };
    }

    const parcours = await getParcoursComplet(session.userId);
    if (!parcours) {
      return {
        success: false,
        error: "Parcours non trouvé",
      };
    }

    // Récupérer tous les dossiers
    const dossiers = await getAllDossiersByParcours(parcours.parcours.id);

    // Synchroniser tous
    const result = await syncAllDossiers(
      parcours.parcours.id,
      dossiers.map((d) => ({
        id: d.id,
        step: d.step,
        dsNumber: d.dsNumber,
      }))
    );

    return result;
  } catch (error) {
    console.error("Erreur syncAllUserDossiers:", error);
    return {
      success: false,
      error: "Erreur lors de la synchronisation complète",
    };
  }
}
