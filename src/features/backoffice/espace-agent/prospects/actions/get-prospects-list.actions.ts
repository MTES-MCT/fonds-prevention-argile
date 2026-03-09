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
    console.log("[DEBUG-PROSPECTS] getCurrentUser() →", JSON.stringify({
      id: user.id,
      role: user.role,
      authMethod: user.authMethod,
      agentId: user.agentId,
      allersVersId: user.allersVersId,
      entrepriseAmoId: user.entrepriseAmoId,
    }));

    if (!user.allersVersId) {
      console.log("[DEBUG-PROSPECTS] ❌ allersVersId is falsy, returning error");
      return {
        success: false,
        error: "Agent non lié à une structure Allers-Vers",
      };
    }

    // Récupérer les prospects
    const agentInput = {
      id: user.agentId ?? "",
      role: user.role,
      entrepriseAmoId: user.entrepriseAmoId ?? null,
      allersVersId: user.allersVersId,
    };
    console.log("[DEBUG-PROSPECTS] agentInput →", JSON.stringify(agentInput));

    const result = await prospectsListService.getProspectsForAgent(
      agentInput,
      filters
    );

    console.log("[DEBUG-PROSPECTS] result totals →", JSON.stringify({
      totalProspects: result.totalProspects,
      totalEligibles: result.totalEligibles,
      totalArchives: result.totalArchives,
      territoriesCovered: result.territoriesCovered,
      hasAmoDisponible: result.hasAmoDisponible,
    }));

    return {
      success: true,
      data: result,
    };
  } catch (error) {
    console.error("[DEBUG-PROSPECTS] ❌ CATCH error in getProspectsListAction:", error);
    return {
      success: false,
      error: "Erreur lors de la récupération des prospects",
    };
  }
}
