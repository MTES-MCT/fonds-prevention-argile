"use server";

import { getSession } from "@/features/auth/server";
import { recomputeParcoursStatus, syncDossierStatus, syncAllDossiers } from "../services/ds-sync.service";
import { getDossierByStep, getAllDossiersByParcours } from "../services/dossier-ds.service";
import { DSStatus } from "../domain/value-objects/ds-status";
import type { Step } from "../../core/domain/value-objects/step";
import type { ActionResult } from "@/shared/types";
import { getParcoursComplet, moveToNextStep } from "../../core/services";

/**
 * Actions de synchronisation des statuts DS
 */

interface SyncResult {
  updated: boolean;
  oldStatus?: string;
  newStatus?: string;
  // true si l'auto-progression a fait avancer l'étape pendant cette sync
  // (sert à l'UI pour rafraîchir même quand `updated` est false — cas d'un
  // dossier déjà `valide` qui passe à l'étape suivante sans changement DS).
  stepAdvanced?: boolean;
}

/**
 * Synchronise le statut du dossier pour une étape donnée
 */
export async function syncUserDossierStatus(step: Step): Promise<ActionResult<SyncResult>> {
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
          oldStatus: dossier.dsStatus ?? undefined,
          newStatus: dossier.dsStatus ?? undefined,
        },
      };
    }

    // Synchroniser le dossier
    const syncResult = await syncDossierStatus(parcours.parcours.id, step, dossier.dsNumber);

    // Recalculer current_status sur la base du dossier de l'étape courante
    // (préserve le comportement antérieur où la sync UI mettait à jour le parcours)
    await recomputeParcoursStatus(parcours.parcours.id);

    // Auto-progression : si l'étape courante est validée, avancer immédiatement
    // (comme le CRON) plutôt que de faire attendre l'usager connecté le prochain run.
    // `moveToNextStep` est idempotent et no-op (aucune écriture) si le statut n'est pas
    // VALIDE. Voir FLOW-AND-SYNC §6.1.
    const stepBefore = parcours.parcours.currentStep;
    const moveResult = await moveToNextStep(session.userId);
    const stepAdvanced = moveResult.success && moveResult.data.state.step !== stepBefore;

    if (!syncResult.success) {
      return syncResult;
    }

    return {
      success: true,
      data: { ...syncResult.data, stepAdvanced },
    };
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
export async function syncAllUserDossiers(): Promise<ActionResult<{ totalUpdated: number; stepAdvanced?: boolean }>> {
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

    // Auto-progression côté UI (no-op si l'étape courante n'est pas VALIDE). Voir §6.1.
    const stepBefore = parcours.parcours.currentStep;
    const moveResult = await moveToNextStep(session.userId);
    const stepAdvanced = moveResult.success && moveResult.data.state.step !== stepBefore;

    if (!result.success) {
      return result;
    }

    return {
      success: true,
      data: { ...result.data, stepAdvanced },
    };
  } catch (error) {
    console.error("Erreur syncAllUserDossiers:", error);
    return {
      success: false,
      error: "Erreur lors de la synchronisation complète",
    };
  }
}
