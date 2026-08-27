import { eq } from "drizzle-orm";
import { db } from "@/shared/database/client";
import { parcoursAmoValidations } from "@/shared/database/schema";
import { parcoursRepo } from "@/shared/database/repositories";
import {
  calculateAgentScope,
  verifyProspectTerritoryAccess,
} from "@/features/auth/permissions/services/agent-scope.service";
import { UserRole } from "@/shared/domain/value-objects/user-role.enum";

/**
 * Qui peut agir sur le dossier DN d'un parcours (rattacher, réinitialiser).
 *
 * Périmètre aligné sur le détail dossier (RBAC-ROLES §6.2) : ownership entreprise quand le
 * dossier a une AMO, contrôle territorial sinon. Le super-admin est national — c'est l'une
 * des exceptions assumées à son read-only (RBAC-ROLES §6.1.3).
 */

/** Mêmes rôles que les autres écritures de suivi sur un dossier. */
export const ROLES_ACTIONS_DOSSIER_DN = [
  UserRole.SUPER_ADMINISTRATEUR,
  UserRole.AMO,
  UserRole.ALLERS_VERS,
  UserRole.AMO_ET_ALLERS_VERS,
];

export function peutAgirSurDossierDn(role: UserRole): boolean {
  return ROLES_ACTIONS_DOSSIER_DN.includes(role);
}

interface AgentPourGarde {
  id: string;
  role: UserRole;
  entrepriseAmoId?: string | null;
  allersVersId?: string | null;
}

/** Renvoie le motif de refus, ou `null` si l'agent peut agir sur ce dossier. */
export async function verifierAccesDossierDn(agent: AgentPourGarde, parcoursId: string): Promise<string | null> {
  if (!peutAgirSurDossierDn(agent.role)) {
    return "Action réservée aux AMO, Allers-vers et super-administrateurs.";
  }

  const parcours = await parcoursRepo.findById(parcoursId);
  if (!parcours) return "Dossier introuvable";

  const [validation] = await db
    .select({ entrepriseAmoId: parcoursAmoValidations.entrepriseAmoId })
    .from(parcoursAmoValidations)
    .where(eq(parcoursAmoValidations.parcoursId, parcoursId))
    .limit(1);

  const scope = await calculateAgentScope({
    id: agent.id,
    role: agent.role,
    entrepriseAmoId: agent.entrepriseAmoId ?? null,
    allersVersId: agent.allersVersId ?? null,
  });

  if (scope.canViewAllDossiers) return null;

  if (validation?.entrepriseAmoId) {
    return validation.entrepriseAmoId !== agent.entrepriseAmoId
      ? "Ce dossier appartient à une autre entreprise AMO."
      : null;
  }

  return verifyProspectTerritoryAccess(parcoursId, {
    id: agent.id,
    role: agent.role,
    entrepriseAmoId: agent.entrepriseAmoId ?? null,
    allersVersId: agent.allersVersId ?? null,
  });
}
