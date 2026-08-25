import { db } from "@/shared/database/client";
import { dossiersDemarchesSimplifiees, ORIGINE_TENTATIVE } from "@/shared/database/schema";
import { dossiersDsTentativesRepo } from "@/shared/database/repositories";
import { eq, and, desc } from "drizzle-orm";
import type { Step } from "../../core/domain/value-objects/step";
import { DSStatus } from "../domain/value-objects/ds-status";
import type { ActionResult } from "@/shared/types";
import { emitBrevoEvent, BREVO_EVENTS, BREVO_ATTRS } from "@/shared/email/brevo";

/**
 * Service de gestion des dossiers Démarches Simplifiées
 */

interface CreateDossierDSParams {
  dsNumber: string;
  dsDemarcheId: string;
  dsUrl?: string;
  /** Identifiant GraphQL du dossier renvoyé par l'API de préremplissage (ADR-0026). */
  dsId?: string;
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
    // Pointeur et registre dans la même transaction : un pointeur sans tentative connue
    // doit être impossible, sinon le numéro se perd au premier remplacement (ADR-0027).
    const dossier = await db.transaction(async (tx) => {
      const [row] = await tx
        .insert(dossiersDemarchesSimplifiees)
        .values({
          parcoursId,
          step,
          dsNumber: params.dsNumber,
          dsDemarcheId: params.dsDemarcheId,
          dsUrl: params.dsUrl,
          dsId: params.dsId,
        })
        .returning();

      await dossiersDsTentativesRepo.record(
        {
          parcoursId,
          step,
          dsNumber: params.dsNumber,
          origine: ORIGINE_TENTATIVE.PREFILL,
          dsId: params.dsId,
          dsDemarcheId: params.dsDemarcheId,
        },
        tx
      );

      return row;
    });

    // Synchro Brevo (flux) : dossier DN créé en brouillon (déposé plus tard, ds_status
    // encore NULL). Réutilise DN_UPDATE avec old/new vides plutôt qu'un évènement dédié —
    // best-effort, cf. `emitBrevoEvent`.
    await emitBrevoEvent(parcoursId, BREVO_EVENTS.DN_UPDATE, {
      attributes: { [BREVO_ATTRS.DS_STATUT]: "" },
      eventProperties: { step, old_ds_status: "", new_ds_status: "" },
    });

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
 * Enregistre le verdict DN observé au dernier sondage de la sync (état réel côté DN, ou
 * "not_found" / "unauthorized" / "api_error"). Sert au diagnostic pour classer la liste sur
 * la vérité DN en lecture DB, sans rappeler l'API. Léger : un seul UPDATE, aucun autre champ.
 */
export async function recordDnProbeState(dossierId: string, state: string): Promise<void> {
  await db
    .update(dossiersDemarchesSimplifiees)
    .set({ dnProbeState: state, dnProbeAt: new Date() })
    .where(eq(dossiersDemarchesSimplifiees.id, dossierId));
}

/**
 * Récupère un dossier DS par étape
 */
export async function getDossierByStep(parcoursId: string, step: Step) {
  // `ORDER BY` explicite : la contrainte unique (parcours_id, step) rend le doublon impossible,
  // mais un LIMIT 1 sans ordre resterait indéterministe si elle venait à sauter.
  const [dossier] = await db
    .select()
    .from(dossiersDemarchesSimplifiees)
    .where(and(eq(dossiersDemarchesSimplifiees.parcoursId, parcoursId), eq(dossiersDemarchesSimplifiees.step, step)))
    .orderBy(desc(dossiersDemarchesSimplifiees.createdAt))
    .limit(1);

  return dossier || null;
}

interface UpdateDossierStatusDates {
  submittedAt?: Date;
  instructedAt?: Date;
  processedAt?: Date;
}

/**
 * Met à jour le statut DS d'un dossier.
 * Les dates (submittedAt / instructedAt / processedAt) ne sont écrites que si fournies : spread
 * conditionnel, jamais d'écrasement d'une date existante par `null`.
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
        // `Date` typée via le mapper Drizzle : ne jamais l'interpoler dans un `sql` brut,
        // postgres.js ne sait pas la sérialiser et fait planter l'UPDATE (ERR_INVALID_ARG_TYPE).
        ...(dates?.submittedAt && { submittedAt: dates.submittedAt }),
        ...(dates?.instructedAt && { instructedAt: dates.instructedAt }),
        ...(dates?.processedAt && { processedAt: dates.processedAt }),
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
