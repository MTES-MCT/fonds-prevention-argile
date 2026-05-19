"use server";

import { resolveEspaceAgentAccess } from "@/features/backoffice/shared/actions/super-admin-access";
import { getDossiersByAgent } from "../services/dossiers-territoire.service";
import type { DossierItem, DossiersTerritoireFilters } from "../domain/types/dossiers-territoire.types";
import type { ActionResult } from "@/shared/types";

export interface DossiersTerritoireData {
  dossiers: DossierItem[];
  total: number;
}

/**
 * Récupère les dossiers du territoire de l'agent connecté. Le filtrage par
 * type de responsable (AV/AMO/Ménage/DDT/Archivés) et par EPCI est fait côté
 * UI sur la liste unifiée.
 */
export async function getDossiersTerritoireDataAction(
  filters?: DossiersTerritoireFilters
): Promise<ActionResult<DossiersTerritoireData>> {
  try {
    const access = await resolveEspaceAgentAccess();
    if (access.kind === "error") {
      return { success: false, error: access.error };
    }

    const { agent } = access;
    const { dossiers } = await getDossiersByAgent(
      {
        id: agent.id,
        role: agent.role,
        entrepriseAmoId: agent.entrepriseAmoId ?? null,
        allersVersId: agent.allersVersId ?? null,
      },
      filters
    );

    return {
      success: true,
      data: { dossiers, total: dossiers.length },
    };
  } catch (error) {
    console.error("[getDossiersTerritoireDataAction] Erreur:", error);
    return { success: false, error: "Erreur lors de la récupération des dossiers" };
  }
}
