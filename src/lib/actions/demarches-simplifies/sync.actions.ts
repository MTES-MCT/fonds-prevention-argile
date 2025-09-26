"use server";

import {
  syncDossierEligibiliteStatus,
  syncAllDossiersForUser,
} from "@/lib/database/services/dossier-ds-sync.service";
import { progressParcours } from "@/lib/database/services/parcours.service";
import type { ActionResult } from "../types";
import { DSStatus, Step } from "@/lib/parcours/parcours.types";
import { getSession } from "@/lib/auth/services/auth.service";

/**
 * Synchronise le statut du dossier de l'utilisateur connecté
 */
export async function syncUserDossierStatus(
  step: Step = Step.ELIGIBILITE
): Promise<
  ActionResult<{
    updated: boolean;
    oldStatus?: string;
    newStatus?: string;
    shouldRefresh: boolean;
  }>
> {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return {
        success: false,
        error: "Non connecté",
      };
    }

    const syncResult = await syncDossierEligibiliteStatus(session.userId, step);

    
    // Si le dossier n'existe pas
    if (
      syncResult.error?.includes("non trouvé") ||
      syncResult.error?.includes("not found")
    ) {
      return {
        success: true,
        data: {
          updated: false,
          shouldRefresh: false,
          oldStatus: DSStatus.NON_ACCESSIBLE, // État custom
          newStatus: DSStatus.NON_ACCESSIBLE,
        },
      };
    }

    if (syncResult.error) {
      return {
        success: false,
        error: syncResult.error,
      };
    }

    // Si validé, progresser automatiquement
    if (syncResult.updated && syncResult.newStatus === DSStatus.ACCEPTE) {
      try {
        await progressParcours(session.userId);
      } catch (error) {
        console.error("Erreur progression:", error);
      }
    }

    return {
      success: true,
      data: {
        updated: syncResult.updated,
        oldStatus: syncResult.oldStatus,
        newStatus: syncResult.newStatus,
        shouldRefresh: syncResult.updated,
      },
    };
  } catch (error) {
    console.error("Erreur synchronisation:", error);
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
  ActionResult<{
    totalUpdated: number;
  }>
> {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return {
        success: false,
        error: "Non connecté",
      };
    }

    const { totalUpdated } = await syncAllDossiersForUser(session.userId);

    return {
      success: true,
      data: { totalUpdated },
    };
  } catch (error) {
    console.error("Erreur synchronisation complète:", error);
    return {
      success: false,
      error: "Erreur lors de la synchronisation",
    };
  }
}
