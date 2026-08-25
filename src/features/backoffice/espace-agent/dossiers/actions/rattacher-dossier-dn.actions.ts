"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/shared/database/client";
import { parcoursAmoValidations } from "@/shared/database/schema";
import { parcoursRepo, parcoursActionsRepo } from "@/shared/database/repositories";
import { getCurrentAgent } from "@/features/backoffice/shared/actions/agent.actions";
import {
  calculateAgentScope,
  verifyProspectTerritoryAccess,
} from "@/features/auth/permissions/services/agent-scope.service";
import { rattacherDossierManuel } from "@/features/parcours/dossiers-ds/services/reconciliation.service";
import { buildAuthorSnapshot } from "@/features/backoffice/espace-agent/shared/services/author-snapshot";
import { ACTION_TYPE_DOSSIER_DN_RATTACHE } from "@/features/backoffice/espace-agent/shared/domain/types/action.types";
import { UserRole } from "@/shared/domain/value-objects/user-role.enum";
import type { ActionResult } from "@/shared/types";

/** Mêmes rôles que les autres écritures de suivi sur un dossier. */
const ROLES_RATTACHEMENT = [
  UserRole.SUPER_ADMINISTRATEUR,
  UserRole.AMO,
  UserRole.ALLERS_VERS,
  UserRole.AMO_ET_ALLERS_VERS,
];

/**
 * Rattache un dossier DN existant à un parcours, par son numéro (ADR-0027).
 * Recours quand le dossier a été créé hors de notre lien : sans annotation FPA, la
 * réconciliation automatique ne peut pas le retrouver.
 *
 * Accès aligné sur le détail dossier (cf. RBAC-ROLES §6.2) : ownership entreprise quand le
 * dossier a une AMO, contrôle territorial sinon. La validation métier (dossier réellement
 * déposé, numéro non déjà pris) est dans le service.
 */
export async function rattacherDossierDnAction(parcoursId: string, dsNumber: string): Promise<ActionResult<void>> {
  try {
    const agentResult = await getCurrentAgent();
    if (!agentResult.success) return { success: false, error: agentResult.error };
    const agent = agentResult.data;

    if (!ROLES_RATTACHEMENT.includes(agent.role)) {
      return { success: false, error: "Action réservée aux AMO, Allers-vers et super-administrateurs." };
    }

    const parcours = await parcoursRepo.findById(parcoursId);
    if (!parcours) return { success: false, error: "Dossier introuvable" };

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

    if (!scope.canViewAllDossiers) {
      if (validation?.entrepriseAmoId) {
        if (validation.entrepriseAmoId !== agent.entrepriseAmoId) {
          return { success: false, error: "Ce dossier appartient à une autre entreprise AMO." };
        }
      } else {
        // Renvoie le motif de refus, ou null si l'accès est accordé.
        const refus = await verifyProspectTerritoryAccess(parcoursId, {
          id: agent.id,
          role: agent.role,
          entrepriseAmoId: agent.entrepriseAmoId ?? null,
          allersVersId: agent.allersVersId ?? null,
        });
        if (refus) return { success: false, error: refus };
      }
    }

    const result = await rattacherDossierManuel({
      parcoursId,
      step: parcours.currentStep,
      dsNumber,
    });
    if (!result.success) return { success: false, error: result.error };

    const snapshot = await buildAuthorSnapshot(agent);
    await parcoursActionsRepo.create({
      parcoursId,
      agentId: agent.id,
      actionType: ACTION_TYPE_DOSSIER_DN_RATTACHE,
      message: `Dossier Démarches Numériques n° ${result.data.dsNumber} rattaché manuellement à l'étape ${parcours.currentStep}.`,
      authorName: snapshot.authorName,
      authorStructure: snapshot.authorStructure,
      authorStructureType: snapshot.authorStructureType,
    });

    revalidatePath(`/espace-agent/dossiers/${parcoursId}`);
    return { success: true, data: undefined };
  } catch (error) {
    console.error("Erreur rattacherDossierDnAction:", error);
    return { success: false, error: "Erreur lors du rattachement du dossier" };
  }
}
