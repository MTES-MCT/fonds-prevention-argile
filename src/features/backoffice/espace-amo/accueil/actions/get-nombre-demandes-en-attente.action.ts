"use server";

import { count, eq, and } from "drizzle-orm";
import { db } from "@/shared/database/client";
import { parcoursAmoValidations } from "@/shared/database/schema";
import { StatutValidationAmo } from "@/shared/domain/value-objects/statut-validation-amo.enum";
import { getCurrentAgent } from "@/features/backoffice/shared/actions/agent.actions";

/**
 * Récupère le nombre de demandes d'accompagnement en attente pour l'AMO connecté
 *
 * Utilisé pour afficher le badge dans la navigation
 */
export async function getNombreDemandesEnAttenteAction(): Promise<number> {
  try {
    const agentResult = await getCurrentAgent();

    if (!agentResult.success || !agentResult.data.entrepriseAmoId) {
      return 0;
    }

    const result = await db
      .select({ count: count() })
      .from(parcoursAmoValidations)
      .where(
        and(
          eq(parcoursAmoValidations.entrepriseAmoId, agentResult.data.entrepriseAmoId),
          eq(parcoursAmoValidations.statut, StatutValidationAmo.EN_ATTENTE)
        )
      );

    return result[0]?.count ?? 0;
  } catch (error) {
    console.error("[getNombreDemandesEnAttenteAction] Erreur:", error);
    return 0;
  }
}
