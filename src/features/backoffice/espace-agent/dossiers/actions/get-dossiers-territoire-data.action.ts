"use server";

import { resolveEspaceAgentAccess } from "@/features/backoffice/shared/actions/super-admin-access";
import { getDossiersByAgent } from "../services/dossiers-territoire.service";
import type { DossierItem, DossiersTerritoireFilters } from "../domain/types/dossiers-territoire.types";
import type { ActionResult } from "@/shared/types";

export interface DossiersTerritoireData {
  suivis: DossierItem[];
  archives: DossierItem[];
  nombreSuivis: number;
  nombreArchives: number;
}

/**
 * Récupère les dossiers du territoire de l'agent connecté, séparés en suivis
 * (actifs) et archivés. Le rôle (y compris SUPER_ADMINISTRATEUR) est porté
 * directement par l'agent — `calculateAgentScope` gère le branchement.
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

    const suivis = dossiers.filter((d) => d.archivedAt === null);
    const archives = dossiers.filter((d) => d.archivedAt !== null);

    return {
      success: true,
      data: {
        suivis,
        archives,
        nombreSuivis: suivis.length,
        nombreArchives: archives.length,
      },
    };
  } catch (error) {
    console.error("[getDossiersTerritoireDataAction] Erreur:", error);
    return { success: false, error: "Erreur lors de la récupération des dossiers" };
  }
}
