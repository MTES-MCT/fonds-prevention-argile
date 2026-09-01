"use server";

import { revalidatePath } from "next/cache";
import { getCurrentAgent } from "@/features/backoffice/shared/actions/agent.actions";
import { reinitialiserDossierEtape } from "@/features/parcours/dossiers-ds/services/regeneration.service";
import { logSystemAction } from "@/features/backoffice/espace-agent/shared/services/action-audit.service";
import { verifierAccesDossierDn } from "@/features/backoffice/espace-agent/shared/services/dossier-dn-permissions.service";
import { ACTION_TYPE_DOSSIER_DN_REINITIALISE } from "@/features/backoffice/espace-agent/shared/domain/types/action.types";
import { STEP_LABELS, type Step } from "@/shared/domain/value-objects/step.enum";
import type { ActionResult } from "@/shared/types";

/**
 * Rend au demandeur un lien de formulaire neuf pour une étape (ADR-0026, ADR-0027).
 *
 * Deux situations indiscernables l'appellent : l'abandon en cours de route, et le brouillon
 * créé sous un autre compte DN que celui qu'il utilise aujourd'hui. Dans les deux cas, le
 * numéro courant part au registre des tentatives avant que le pointeur ne soit retiré : rien
 * n'est perdu, et la réconciliation le rattrapera s'il finit déposé.
 *
 * Le service refuse de lui-même sur un dossier déjà déposé, et rattache au lieu de recréer si
 * l'un des numéros connus a été transmis entre-temps.
 */
export async function reinitialiserDossierDnAction(
  parcoursId: string,
  step: Step
): Promise<ActionResult<{ statut: "rattache" | "a_recreer"; dsNumber?: string }>> {
  try {
    const agentResult = await getCurrentAgent();
    if (!agentResult.success) return { success: false, error: agentResult.error };
    const agent = agentResult.data;

    const refus = await verifierAccesDossierDn(agent, parcoursId);
    if (refus) return { success: false, error: refus };

    const result = await reinitialiserDossierEtape(parcoursId, step);
    if (!result.success) return result;

    await logSystemAction({
      parcoursId,
      author: { agent },
      actionType: ACTION_TYPE_DOSSIER_DN_REINITIALISE,
      message:
        result.data.statut === "rattache"
          ? `Formulaire ${STEP_LABELS[step]} : dossier DN n° ${result.data.dsNumber} retrouvé déposé et rattaché.`
          : `Formulaire ${STEP_LABELS[step]} réinitialisé : le demandeur repart d'un lien neuf.`,
    });

    revalidatePath(`/espace-agent/dossiers/${parcoursId}`);
    return { success: true, data: result.data };
  } catch (error) {
    console.error("Erreur reinitialiserDossierDnAction:", error);
    return { success: false, error: "Erreur lors de la réinitialisation du formulaire" };
  }
}
