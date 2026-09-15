"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/features/auth/server";
import { parcoursRepo, userRepo } from "@/shared/database/repositories";
import { STEP_LABELS, type Step } from "@/shared/domain/value-objects/step.enum";
import type { ActionResult } from "@/shared/types";
import { logSystemAction } from "@/features/backoffice/espace-agent/shared/services/action-audit.service";
import {
  ACTION_TYPE_DOSSIER_DN_RATTACHE,
  ACTION_TYPE_DOSSIER_DN_REINITIALISE,
} from "@/features/backoffice/espace-agent/shared/domain/types/action.types";
import { recreerFormulaireDemandeur, type ResultatRecreation } from "../services/recreation-formulaire.service";

/**
 * « Mon lien ne fonctionne plus, créez-m'en un nouveau » (ADR-0027).
 * Scopée par la session : le parcours est résolu par `userId`, aucun identifiant n'entre
 * par le client.
 */
export async function recreerFormulaireAction(step: Step): Promise<ActionResult<ResultatRecreation>> {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return { success: false, error: "Vous devez être connecté" };
    }

    const result = await recreerFormulaireDemandeur(session.userId, step);
    if (!result.success) return result;

    // Best-effort jusqu'au bout : le formulaire est déjà recréé, un audit qui échoue ne doit
    // pas renvoyer une erreur au demandeur.
    try {
      await auditer(session.userId, result.data);
    } catch (error) {
      console.error("recreerFormulaireAction : audit best-effort échoué", error);
    }

    revalidatePath("/mon-compte");
    revalidatePath("/espace-agent", "layout");

    return result;
  } catch (error) {
    console.error("Erreur recreerFormulaireAction:", error);
    return { success: false, error: "Erreur lors de la création du nouveau formulaire" };
  }
}

/** Audit best-effort, visible des professionnels : l'auteur est le demandeur, pas un agent. */
async function auditer(userId: string, data: ResultatRecreation): Promise<void> {
  const [parcours, user] = await Promise.all([parcoursRepo.findByUserId(userId), userRepo.findById(userId)]);
  if (!parcours) return;

  const nom = `${user?.prenom ?? ""} ${user?.nom ?? ""}`.trim();
  const libelle = STEP_LABELS[data.step];

  const { actionType, message } =
    data.statut === "rattache"
      ? {
          actionType: ACTION_TYPE_DOSSIER_DN_RATTACHE,
          message: `Formulaire ${libelle} : le dossier DN n° ${data.dsNumber} avait été transmis, il a été rattaché.`,
        }
      : {
          actionType: ACTION_TYPE_DOSSIER_DN_REINITIALISE,
          message: `Formulaire ${libelle} : le demandeur a demandé un nouveau formulaire (ancien n° ${data.ancienDsNumber} conservé).`,
        };

  await logSystemAction({ parcoursId: parcours.id, author: { demandeur: { nom } }, actionType, message });
}
