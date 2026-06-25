"use server";

import { resolveEspaceAgentAccess } from "@/features/backoffice/shared/actions/super-admin-access";
import { calculateAgentScope } from "@/features/auth/permissions/services/agent-scope.service";
import { parcoursRepo } from "@/shared/database";

// Badge de l'onglet « Dossiers ». Retourne 0 en cas d'erreur pour ne pas casser la nav.
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

    // Périmètre = canViewAllDossiers (admins), pas isNational : l'analyste national ne voit aucun dossier. Sans périmètre → 0.
    const hasScope =
      scope.canViewAllDossiers ||
      scope.departements.length > 0 ||
      scope.epcis.length > 0 ||
      scope.canViewDossiersByEntreprise;
    if (!hasScope) return 0;

    const departements = scope.canViewAllDossiers ? [] : scope.departements;
    const epcis = scope.canViewAllDossiers ? [] : scope.epcis;

    return parcoursRepo.countParcoursByTerritoire(departements, epcis);
  } catch (error) {
    console.error("[getNombreDossiersAction] Erreur:", error);
    return 0;
  }
}
