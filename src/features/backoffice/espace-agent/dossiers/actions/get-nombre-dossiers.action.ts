"use server";

import { resolveEspaceAgentAccess } from "@/features/backoffice/shared/actions/super-admin-access";
import { calculateAgentScope } from "@/features/auth/permissions/services/agent-scope.service";
import { perimetreListing } from "@/features/auth/permissions/domain/perimetre-listing";
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

    // Même périmètre que le listing, pour que le badge égale « Tous les dossiers ».
    const perimetre = perimetreListing(scope);
    if (perimetre.kind === "aucun") return 0;

    return parcoursRepo.countParcoursByTerritoire(perimetre);
  } catch (error) {
    console.error("[getNombreDossiersAction] Erreur:", error);
    return 0;
  }
}
