"use server";

import { revalidatePath } from "next/cache";
import { getCurrentAgent } from "@/features/backoffice/shared/actions/agent.actions";
import { isSuperAdminRole } from "@/shared/domain/value-objects/user-role.enum";
import { rattacherAmo } from "@/features/parcours/amo/services/rattachement-amo.service";
import { logSystemAction } from "@/features/backoffice/espace-agent/shared/services/action-audit.service";
import { ACTION_TYPE_AMO_RATTACHEE } from "@/features/backoffice/espace-agent/shared/domain/types/action.types";
import {
  listerDossiersARattacher,
  type DossierARattacher,
} from "@/features/backoffice/administration/diagnostics/services/amo-a-rattacher.service";
import type { ActionResult } from "@/shared/types";

/**
 * File « AMO à rattacher » de la page diagnostics : des parcours sans accompagnateur dans un
 * département où l'AMO est obligatoire (ADR-0037). Réservée au super-admin comme le reste de
 * la page — elle expose des noms de demandeurs.
 */
async function ensureSuperAdmin() {
  const agentResult = await getCurrentAgent();
  if (!agentResult.success) return { ok: false as const, error: agentResult.error };
  if (!isSuperAdminRole(agentResult.data.role)) {
    return { ok: false as const, error: "Accès réservé au super-administrateur" };
  }
  return { ok: true as const, agent: agentResult.data };
}

export async function listerDossiersARattacherAction(): Promise<ActionResult<DossierARattacher[]>> {
  try {
    const garde = await ensureSuperAdmin();
    if (!garde.ok) return { success: false, error: garde.error };

    return { success: true, data: await listerDossiersARattacher() };
  } catch (error) {
    console.error("[listerDossiersARattacherAction] Erreur:", error);
    return { success: false, error: "Erreur lors du chargement des dossiers à rattacher" };
  }
}

/**
 * Contrairement au script ops, l'action a un agent connecté : la décision est donc tracée
 * dans l'historique du dossier, comme toute décision structurante (ADR-0028).
 */
export async function rattacherAmoAction(parcoursId: string): Promise<ActionResult<{ amoNom: string }>> {
  try {
    const garde = await ensureSuperAdmin();
    if (!garde.ok) return { success: false, error: garde.error };

    const result = await rattacherAmo({ parcoursId });
    if (!result.success) return { success: false, error: result.error };

    await logSystemAction({
      parcoursId,
      author: { agent: garde.agent },
      actionType: ACTION_TYPE_AMO_RATTACHEE,
      message: `${result.data.amoNom} rattachée (source : ${result.data.origine === "audit" ? "AMO d'origine" : "territoire"}). La demande repasse en attente de validation.`,
    });

    revalidatePath("/administration/diagnostics");
    revalidatePath("/espace-agent", "layout");
    return { success: true, data: { amoNom: result.data.amoNom } };
  } catch (error) {
    console.error("[rattacherAmoAction] Erreur:", error);
    return { success: false, error: "Erreur lors du rattachement de l'AMO" };
  }
}
