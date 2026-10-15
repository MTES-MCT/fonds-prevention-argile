"use server";

import { unstable_rethrow } from "next/navigation";
import { parcoursRepo } from "@/shared/database/repositories";
import type { ActionResult } from "@/shared/types/action-result.types";
import { getCurrentAgent } from "@/features/backoffice/shared/actions/agent.actions";
import { assertNotSuperAdminReadOnly } from "@/features/backoffice/shared/actions/super-admin-access";
import { refusAccesEspaceAgent } from "@/features/backoffice/espace-agent/shared/services/acces-espace-agent.service";
import { creerSimulationVulnerabilite } from "@/features/vulnerabilite-rga/services/creer-simulation.service";
import { vulnerabiliteSimulationPayloadSchema } from "@/features/vulnerabilite-rga/domain/value-objects/simulation-payload";
import { isVulnerabiliteRgaActive } from "@/features/vulnerabilite-rga/domain/value-objects/vulnerabilite-disponibilite";
import {
  categoriserReponses,
  compterPoints,
} from "@/features/vulnerabilite-rga/domain/services/categorisation.service";
import { CATEGORIES_AFFICHAGE } from "@/features/vulnerabilite-rga/domain/value-objects/grille-categorisation";
import { logSystemAction } from "../services/action-audit.service";
import { resoudreDossierTestVulnerabilite } from "../services/test-vulnerabilite-agent.service";
import { ACTION_TYPE_VULNERABILITE_REALISEE_PAR_AGENT } from "../domain/types/action.types";

/** Une phrase d'historique : des décomptes, jamais les réponses ni l'adresse. */
function decrireDecompte(compte: ReturnType<typeof compterPoints>): string {
  const parts = (["critique", "vigilance"] as const)
    .filter((categorie) => compte[categorie] > 0)
    .map((categorie) => {
      const { label, pluriel } = CATEGORIES_AFFICHAGE[categorie];
      return `${compte[categorie]} ${(compte[categorie] > 1 ? pluriel : label).toLowerCase()}`;
    });
  return parts.length > 0 ? `Résultat : ${parts.join(", ")}.` : "Résultat : aucun point critique ni de vigilance.";
}

/**
 * Enregistre sur le dossier un test de vulnérabilité fait par l'agent avec le demandeur au téléphone.
 *
 * `id` est celui de la page d'origine (validation AMO ou parcours d'un prospect) : le parcours en est
 * déduit côté serveur, après les mêmes contrôles d'accès que l'édition de simulation. Le résultat remplace
 * celui que portait le parcours, comme quand le demandeur refait le test lui-même (ADR-0032).
 */
export async function enregistrerTestVulnerabiliteAgentAction(
  id: string,
  payload: unknown
): Promise<ActionResult<{ parcoursId: string }>> {
  try {
    const refusEspaceAgent = await refusAccesEspaceAgent();
    if (refusEspaceAgent) return { success: false, error: refusEspaceAgent };

    // SUPER_ADMIN : lecture seule dans /espace-agent
    const readOnlyError = await assertNotSuperAdminReadOnly();
    if (readOnlyError) return { success: false, error: readOnlyError };

    // Une Server Action reste appelable même quand sa page renvoie 404.
    if (!isVulnerabiliteRgaActive()) {
      return { success: false, error: "Le simulateur de vulnérabilité n'est pas disponible" };
    }

    const agentResult = await getCurrentAgent();
    if (!agentResult.success) return { success: false, error: agentResult.error };

    const parsed = vulnerabiliteSimulationPayloadSchema.safeParse(payload);
    if (!parsed.success) {
      // Jamais le contenu du payload dans les logs.
      console.warn("[enregistrerTestVulnerabiliteAgentAction] charge utile invalide");
      return { success: false, error: "Résultat invalide" };
    }

    const dossier = await resoudreDossierTestVulnerabilite(id);
    if (!dossier.success) return { success: false, error: dossier.error };

    const simulation = await creerSimulationVulnerabilite(parsed.data);
    await parcoursRepo.update(dossier.data.parcoursId, { vulnerabiliteSimulationId: simulation.id });

    await logSystemAction({
      parcoursId: dossier.data.parcoursId,
      author: { agent: agentResult.data },
      actionType: ACTION_TYPE_VULNERABILITE_REALISEE_PAR_AGENT,
      message: decrireDecompte(compterPoints(categoriserReponses(parsed.data.reponses))),
    });

    return { success: true, data: { parcoursId: dossier.data.parcoursId } };
  } catch (error) {
    unstable_rethrow(error);
    console.error("[enregistrerTestVulnerabiliteAgentAction] échec de l'enregistrement", error);
    return { success: false, error: "Erreur lors de l'enregistrement du test" };
  }
}
