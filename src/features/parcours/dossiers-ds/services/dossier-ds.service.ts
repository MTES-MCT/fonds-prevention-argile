import { db } from "@/shared/database/client";
import { dossiersDemarchesSimplifiees } from "@/shared/database/schema";
import { eq, and } from "drizzle-orm";
import type { Step } from "../../core/domain/value-objects/step";
import { DSStatus } from "../domain/value-objects/ds-status";
import type { ActionResult } from "@/shared/types";

/**
 * Service de gestion des dossiers Démarches Simplifiées
 */

interface CreateDossierDSParams {
  dsNumber: string;
  dsDemarcheId: string;
  dsUrl?: string;
}

/**
 * Crée un dossier DS pour une étape du parcours
 */
export async function createDossierForCurrentStep(
  userId: string,
  parcoursId: string,
  step: Step,
  params: CreateDossierDSParams
): Promise<ActionResult<{ dossierId: string }>> {
  try {
    const [dossier] = await db
      .insert(dossiersDemarchesSimplifiees)
      .values({
        parcoursId,
        step,
        dsNumber: params.dsNumber,
        dsDemarcheId: params.dsDemarcheId,
        dsUrl: params.dsUrl,
        dsStatus: DSStatus.EN_CONSTRUCTION,
        submittedAt: new Date(),
      })
      .returning();

    return {
      success: true,
      data: { dossierId: dossier.id },
    };
  } catch (error) {
    console.error("Erreur createDossierForCurrentStep:", error);
    return {
      success: false,
      error: "Erreur lors de la création du dossier DS",
    };
  }
}

/**
 * Récupère un dossier DS par étape
 */
export async function getDossierByStep(parcoursId: string, step: Step) {
  const [dossier] = await db
    .select()
    .from(dossiersDemarchesSimplifiees)
    .where(
      and(
        eq(dossiersDemarchesSimplifiees.parcoursId, parcoursId),
        eq(dossiersDemarchesSimplifiees.step, step)
      )
    )
    .limit(1);

  return dossier || null;
}

/**
 * Met à jour le statut DS d'un dossier
 */
export async function updateDossierStatus(
  dossierId: string,
  newStatus: DSStatus
): Promise<ActionResult<{ updated: boolean }>> {
  try {
    await db
      .update(dossiersDemarchesSimplifiees)
      .set({
        dsStatus: newStatus,
        lastSyncAt: new Date(),
        ...(newStatus === DSStatus.ACCEPTE && { processedAt: new Date() }),
      })
      .where(eq(dossiersDemarchesSimplifiees.id, dossierId));

    return {
      success: true,
      data: { updated: true },
    };
  } catch (error) {
    console.error("Erreur updateDossierStatus:", error);
    return {
      success: false,
      error: "Erreur lors de la mise à jour du statut",
    };
  }
}

/**
 * Récupère tous les dossiers d'un parcours
 */
export async function getAllDossiersByParcours(parcoursId: string) {
  return db
    .select()
    .from(dossiersDemarchesSimplifiees)
    .where(eq(dossiersDemarchesSimplifiees.parcoursId, parcoursId));
}
