"use server";

import { getCurrentUser } from "@/features/auth/services/user.service";
import { hasPermission } from "@/features/auth/permissions/services/rbac.service";
import { BackofficePermission } from "@/features/auth/permissions/domain/value-objects/rbac-permissions";
import { UserRole } from "@/shared/domain/value-objects";
import { prospectsListService } from "../services/prospects-list.service";
import type { ProspectsListResult, ProspectFilters } from "../domain/types";
import type { ActionResult } from "@/shared/types";

/**
 * Action serveur pour récupérer la liste des prospects
 *
 * @param filters - Filtres optionnels
 * @returns Liste des prospects du territoire de l'agent
 */
export async function getProspectsListAction(
  filters?: ProspectFilters
): Promise<ActionResult<ProspectsListResult>> {
  try {
    // Vérifier l'authentification
    const user = await getCurrentUser();
    if (!user) {
      return {
        success: false,
        error: "Non authentifié",
      };
    }

    const role = user.role as UserRole;

    // Vérifier la permission
    if (!hasPermission(role, BackofficePermission.PROSPECTS_VIEW)) {
      return {
        success: false,
        error: "Permission refusée",
      };
    }

    // Vérifier que l'agent a un allersVersId
    if (!user.allersVersId) {
      return {
        success: false,
        error: "Agent non lié à une structure Allers-Vers",
      };
    }

    // Récupérer les prospects
    const result = await prospectsListService.getProspectsForAgent(
      {
        id: user.agentId ?? "",
        role: user.role,
        entrepriseAmoId: user.entrepriseAmoId ?? null,
        allersVersId: user.allersVersId,
      },
      filters
    );

    return {
      success: true,
      data: result,
    };
  } catch (error) {
    console.error("Erreur getProspectsListAction:", error);
    return {
      success: false,
      error: "Erreur lors de la récupération des prospects",
    };
  }
}
