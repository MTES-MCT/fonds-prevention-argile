"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentAgent } from "@/features/backoffice/shared/actions/agent.actions";
import { logSystemAction } from "@/features/backoffice/espace-agent/shared/services/action-audit.service";
import { ACTION_TYPE_FORMULAIRE_INITIE_PAR_AMO } from "@/features/backoffice/espace-agent/shared/domain/types/action.types";
import { refusAccesEspaceAgent } from "@/features/backoffice/espace-agent/shared/services/acces-espace-agent.service";
import { chargerEtatFormulaireParAmo } from "@/features/parcours/amo/services/formulaire-par-amo.service";
import { createDiagnosticDossier } from "@/features/parcours/core/services/diagnostic.service";
import { parcoursRepo } from "@/shared/database/repositories";
import { INITIATEUR_FORMULAIRE } from "@/shared/domain/value-objects/initiateur-formulaire.enum";
import { Step } from "@/shared/domain/value-objects/step.enum";
import { BREVO_EVENTS, emitBrevoEvent } from "@/shared/email/brevo";
import type { ActionResult } from "@/shared/types";
import { ROLES_INITIATION_FORMULAIRE } from "../domain/initiation-formulaire";

const parcoursIdSchema = z.string().uuid();

/**
 * L'AMO mandataire financier crée la demande de paiement du diagnostic à la place du
 * demandeur : la subvention lui étant versée, elle n'a plus à attendre qu'il fasse la démarche.
 *
 * Réservé aux agents de l'entreprise AMO rattachée au dossier. Le brouillon créé appartiendra
 * au compte DN de l'agent qui l'ouvre, plus à celui du demandeur.
 */
export async function initierFormulaireDiagnosticAction(
  parcoursId: string
): Promise<ActionResult<{ dossierUrl: string }>> {
  try {
    const refusEspaceAgent = await refusAccesEspaceAgent();
    if (refusEspaceAgent) return { success: false, error: refusEspaceAgent };

    const idValide = parcoursIdSchema.safeParse(parcoursId);
    if (!idValide.success) return { success: false, error: "Dossier introuvable" };

    const agentResult = await getCurrentAgent();
    if (!agentResult.success) return { success: false, error: agentResult.error };
    const agent = agentResult.data;

    if (!ROLES_INITIATION_FORMULAIRE.includes(agent.role)) {
      return { success: false, error: "Action réservée à l'AMO mandataire financier du dossier" };
    }

    const parcours = await parcoursRepo.findById(idValide.data);
    if (!parcours) return { success: false, error: "Dossier introuvable" };

    // Propriété avant tout autre motif : un agent d'une autre structure n'apprend rien du dossier.
    const etat = await chargerEtatFormulaireParAmo(parcours.id, Step.DIAGNOSTIC);
    if (!etat.entrepriseAmoId || etat.entrepriseAmoId !== agent.entrepriseAmoId) {
      return { success: false, error: "Action réservée à l'AMO mandataire financier du dossier" };
    }

    if (parcours.archivedAt) {
      return { success: false, error: "Ce dossier est archivé" };
    }

    const result = await createDiagnosticDossier(parcours.userId, INITIATEUR_FORMULAIRE.AMO);
    if (!result.success) return { success: false, error: result.error };

    // Un second clic récupère le lien existant : ni nouvelle trace, ni nouveau mail au demandeur.
    if (result.data.cree) {
      await logSystemAction({
        parcoursId: parcours.id,
        author: { agent },
        actionType: ACTION_TYPE_FORMULAIRE_INITIE_PAR_AMO,
        message: `Demande de paiement du diagnostic initiée par l'AMO mandataire financier (dossier DN n° ${result.data.dossierNumber}).`,
      });

      await emitBrevoEvent(parcours.id, BREVO_EVENTS.DEMANDE_PAIEMENT_INITIEE_PAR_AMO, {
        eventProperties: { step: Step.DIAGNOSTIC, amo_nom: etat.amoNom ?? "" },
      });
    }

    revalidatePath(`/espace-agent/dossiers/${parcours.id}`);
    revalidatePath("/mon-compte");
    return { success: true, data: { dossierUrl: result.data.dossierUrl } };
  } catch (error) {
    console.error("Erreur initierFormulaireDiagnosticAction:", error);
    return { success: false, error: "Erreur lors de la création de la demande de paiement" };
  }
}
