"use server";

import { revalidatePath } from "next/cache";
import { dsObservationsRepo } from "@/shared/database/repositories";
import { RESOLUTION_OBSERVATION } from "@/shared/database/schema";
import { getCurrentAgent } from "@/features/backoffice/shared/actions/agent.actions";
import { rattacherDossierManuel } from "@/features/parcours/dossiers-ds/services/reconciliation.service";
import { logSystemAction } from "@/features/backoffice/espace-agent/shared/services/action-audit.service";
import { verifierAccesDossierDn } from "@/features/backoffice/espace-agent/shared/services/dossier-dn-permissions.service";
import { ACTION_TYPE_DOSSIER_DN_RATTACHE } from "@/features/backoffice/espace-agent/shared/domain/types/action.types";
import type { ActionResult } from "@/shared/types";

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

    const refus = await verifierAccesDossierDn(agent, parcoursId);
    if (refus) return { success: false, error: refus };

    // L'étape est déduite de la démarche du dossier DN, pas du parcours : un dossier
    // d'éligibilité rattaché depuis un parcours au diagnostic doit rester une éligibilité.
    const result = await rattacherDossierManuel({ parcoursId, dsNumber });
    if (!result.success) return { success: false, error: result.error };

    await logSystemAction({
      parcoursId,
      author: { agent },
      actionType: ACTION_TYPE_DOSSIER_DN_RATTACHE,
      message: `Dossier Démarches Numériques n° ${result.data.dsNumber} rattaché manuellement à l'étape ${result.data.step}.`,
    });

    // Le cas sort de la file de rattachement du back-office.
    await dsObservationsRepo.resoudre(result.data.dsNumber, RESOLUTION_OBSERVATION.RATTACHE, agent.id);

    revalidatePath(`/espace-agent/dossiers/${parcoursId}`);
    return { success: true, data: undefined };
  } catch (error) {
    console.error("Erreur rattacherDossierDnAction:", error);
    return { success: false, error: "Erreur lors du rattachement du dossier" };
  }
}
