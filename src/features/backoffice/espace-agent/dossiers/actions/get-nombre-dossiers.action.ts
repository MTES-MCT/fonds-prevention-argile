"use server";

import { resolveEspaceAgentAccess } from "@/features/backoffice/shared/actions/super-admin-access";
import { calculateAgentScope } from "@/features/auth/permissions/services/agent-scope.service";
import { parcoursRepo } from "@/shared/database";

/**
 * Compteur léger pour afficher un badge à côté de l'onglet « Dossiers ».
 * Effectue un comptage minimal côté DB (pas de jointure ni de résolution
 * responsable). Retourne 0 en cas d'erreur — la nav reste affichable.
 */
export async function getNombreDossiersAction(): Promise<number> {
  try {
    const access = await resolveEspaceAgentAccess();
    if (access.kind === "error") return 0;

    const { agent } = access;
    const scope = await calculateAgentScope({
      id: agent.id,
      role: agent.role,
      entrepriseAmoId: agent.entrepriseAmoId ?? null,
      allersVersId: agent.allersVersId ?? null,
    });

    const departements = scope.isNational ? [] : scope.departements;
    const epcis = scope.isNational ? [] : scope.epcis;

    return parcoursRepo.countParcoursByTerritoire(departements, epcis);
  } catch (error) {
    console.error("[getNombreDossiersAction] Erreur:", error);
    return 0;
  }
}
