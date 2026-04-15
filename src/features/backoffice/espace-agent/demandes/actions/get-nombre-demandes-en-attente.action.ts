"use server";

import { count, eq, and } from "drizzle-orm";
import { db } from "@/shared/database/client";
import { parcoursAmoValidations } from "@/shared/database/schema";
import { StatutValidationAmo } from "@/shared/domain/value-objects/statut-validation-amo.enum";
import { resolveEspaceAgentAccess } from "@/features/backoffice/shared/actions/super-admin-access";

/**
 * Récupère le nombre de demandes d'accompagnement en attente pour l'AMO connecté
 *
 * Utilisé pour afficher le badge dans la navigation.
 * SUPER_ADMIN : compte toutes les demandes EN_ATTENTE (vue globale).
 */
export async function getNombreDemandesEnAttenteAction(): Promise<number> {
  try {
    const access = await resolveEspaceAgentAccess();

    if (access.kind === "error") {
      return 0;
    }

    const entrepriseAmoId = access.kind === "super-admin" ? null : access.agent.entrepriseAmoId;

    if (access.kind === "agent" && !entrepriseAmoId) {
      return 0;
    }

    const result = await db
      .select({ count: count() })
      .from(parcoursAmoValidations)
      .where(
        and(
          entrepriseAmoId ? eq(parcoursAmoValidations.entrepriseAmoId, entrepriseAmoId) : undefined,
          eq(parcoursAmoValidations.statut, StatutValidationAmo.EN_ATTENTE)
        )
      );

    return result[0]?.count ?? 0;
  } catch (error) {
    console.error("[getNombreDemandesEnAttenteAction] Erreur:", error);
    return 0;
  }
}
