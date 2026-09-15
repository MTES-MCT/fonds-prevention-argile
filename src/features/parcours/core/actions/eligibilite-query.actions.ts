"use server";

import { getSession } from "@/features/auth/server";
import { parcoursRepo } from "@/shared/database/repositories";
import { ActionResult } from "@/shared/types/action-result.types";
import { isEligibiliteArchiveReason } from "@/features/simulateur/domain/services/eligibilite-archivage.service";

/**
 * Le logement du demandeur connecté est-il **actuellement** déclaré non éligible ?
 *
 * Un seul signal fait foi : le dossier est archivé pour inéligibilité — la raison
 * canonique qu'écrivent aussi bien la qualification d'un Aller-vers que la simulation
 * du demandeur (ADR-0034). Il tombe de lui-même au dé-archivage, ce que la lecture de
 * la dernière qualification ne faisait pas : un dossier redevenu éligible restait
 * affiché « non éligible » alors même que `simulation_redevenue_eligible` était parti.
 *
 * La décision de l'AMO n'entre pas ici : elle est déjà portée par `statutAmo` dans
 * `estLogementNonEligible`. La lire faisait passer toute validation rendue — y compris
 * `LOGEMENT_ELIGIBLE` — pour une inéligibilité, et affichait « Vous n'êtes pas éligible »
 * à tout demandeur accompagné dont l'AMO avait validé l'éligibilité.
 */
export async function estLogementDeclareNonEligible(): Promise<ActionResult<boolean>> {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return { success: false, error: "Non connecté" };
    }

    const parcours = await parcoursRepo.findByUserId(session.userId);
    if (!parcours) {
      return { success: false, error: "Parcours non trouvé" };
    }

    return {
      success: true,
      data: Boolean(parcours.archivedAt) && isEligibiliteArchiveReason(parcours.archiveReason),
    };
  } catch (error) {
    console.error("Erreur estLogementDeclareNonEligible:", error);
    return { success: false, error: "Erreur lors de la lecture de l'éligibilité du dossier" };
  }
}
