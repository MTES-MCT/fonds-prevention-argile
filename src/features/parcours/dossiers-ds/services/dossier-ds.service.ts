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
    .where(and(eq(dossiersDemarchesSimplifiees.parcoursId, parcoursId), eq(dossiersDemarchesSimplifiees.step, step)))
    .limit(1);

  return dossier || null;
}

interface UpdateDossierStatusDates {
  submittedAt?: Date;
  instructedAt?: Date;
}

/**
 * Met à jour le statut DS d'un dossier.
 * Les dates submittedAt et instructedAt ne sont écrites que si elles ne sont pas déjà renseignées (COALESCE).
 */
export async function updateDossierStatus(
  dossierId: string,
  newStatus: DSStatus,
  dates?: UpdateDossierStatusDates
): Promise<ActionResult<{ updated: boolean }>> {
  try {
    await db
      .update(dossiersDemarchesSimplifiees)
      .set({
        dsStatus: newStatus,
        lastSyncAt: new Date(),
        ...(newStatus === DSStatus.ACCEPTE && { processedAt: new Date() }),
        // Dates de dépôt / instruction : passées en `Date` typée (mapper Drizzle, comme
        // lastSyncAt). NE PAS interpoler un `Date` dans un `sql` brut (COALESCE) — postgres.js
        // ne sait pas le sérialiser et fait planter tout l'UPDATE (ERR_INVALID_ARG_TYPE).
        // datePassageEnConstruction/EnInstruction sont immuables côté DS → réécrire = idempotent ;
        // le spread conditionnel évite d'écraser une date existante par `null`.
        ...(dates?.submittedAt && { submittedAt: dates.submittedAt }),
        ...(dates?.instructedAt && { instructedAt: dates.instructedAt }),
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
  return db.select().from(dossiersDemarchesSimplifiees).where(eq(dossiersDemarchesSimplifiees.parcoursId, parcoursId));
}
