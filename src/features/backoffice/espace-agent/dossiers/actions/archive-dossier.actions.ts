"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/shared/database/client";
import { parcoursAmoValidations } from "@/shared/database/schema";
import { getCurrentAgent } from "@/features/backoffice/shared/actions/agent.actions";
import { parcoursPreventionRepository } from "@/shared/database/repositories/parcours-prevention.repository";
import { SituationParticulier } from "@/shared/domain/value-objects/situation-particulier.enum";
import type { ActionResult } from "@/shared/types";

/**
 * Archive un dossier AMO (parcours prévention)
 *
 * Vérifie que l'agent connecté est bien rattaché à l'entreprise AMO du dossier.
 */
export async function archiveDossierAction(
  parcoursId: string,
  archiveReason: string,
): Promise<ActionResult<void>> {
  try {
    const agentResult = await getCurrentAgent();
    if (!agentResult.success) {
      return { success: false, error: agentResult.error };
    }

    const agent = agentResult.data;

    if (!agent.entrepriseAmoId) {
      return { success: false, error: "Aucune entreprise AMO associée à votre compte" };
    }

    // Vérifier que le dossier appartient à l'entreprise AMO de l'agent
    const [validation] = await db
      .select({ id: parcoursAmoValidations.id })
      .from(parcoursAmoValidations)
      .where(
        and(
          eq(parcoursAmoValidations.parcoursId, parcoursId),
          eq(parcoursAmoValidations.entrepriseAmoId, agent.entrepriseAmoId),
        ),
      )
      .limit(1);

    if (!validation) {
      return { success: false, error: "Dossier non trouvé ou non autorisé" };
    }

    await parcoursPreventionRepository.updateSituationParticulier(
      parcoursId,
      SituationParticulier.ARCHIVE,
      archiveReason,
    );

    revalidatePath("/espace-agent", "layout");

    return { success: true, data: undefined };
  } catch (error) {
    console.error("[archiveDossierAction] Erreur:", error);
    return { success: false, error: "Erreur lors de l'archivage du dossier" };
  }
}

/**
 * Désarchive un dossier AMO (parcours prévention)
 *
 * Remet le parcours en statut ELIGIBLE et nettoie les champs d'archivage.
 */
export async function unarchiveDossierAction(parcoursId: string): Promise<ActionResult<void>> {
  try {
    const agentResult = await getCurrentAgent();
    if (!agentResult.success) {
      return { success: false, error: agentResult.error };
    }

    const agent = agentResult.data;

    if (!agent.entrepriseAmoId) {
      return { success: false, error: "Aucune entreprise AMO associée à votre compte" };
    }

    // Vérifier que le dossier appartient à l'entreprise AMO de l'agent
    const [validation] = await db
      .select({ id: parcoursAmoValidations.id })
      .from(parcoursAmoValidations)
      .where(
        and(
          eq(parcoursAmoValidations.parcoursId, parcoursId),
          eq(parcoursAmoValidations.entrepriseAmoId, agent.entrepriseAmoId),
        ),
      )
      .limit(1);

    if (!validation) {
      return { success: false, error: "Dossier non trouvé ou non autorisé" };
    }

    // ELIGIBLE remet le parcours actif (le repository nettoie archivedAt/archiveReason)
    await parcoursPreventionRepository.updateSituationParticulier(
      parcoursId,
      SituationParticulier.ELIGIBLE,
    );

    revalidatePath("/espace-agent", "layout");

    return { success: true, data: undefined };
  } catch (error) {
    console.error("[unarchiveDossierAction] Erreur:", error);
    return { success: false, error: "Erreur lors du désarchivage du dossier" };
  }
}
