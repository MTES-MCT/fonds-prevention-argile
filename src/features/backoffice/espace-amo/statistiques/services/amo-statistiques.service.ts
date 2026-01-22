import { count, eq, and, or } from "drizzle-orm";
import { db } from "@/shared/database/client";
import { parcoursAmoValidations, parcoursPrevention } from "@/shared/database/schema";
import { StatutValidationAmo } from "@/shared/domain/value-objects/statut-validation-amo.enum";
import { Step } from "@/shared/domain/value-objects/step.enum";
import type { AmoIndicateursCles, AmoStatistiques, RepartitionParEtape } from "../domain/types";

/**
 * Service de statistiques pour l'espace AMO
 *
 * Fournit les indicateurs clés pour un AMO connecté
 */

/** Labels des étapes pour l'affichage */
const STEP_LABELS: Record<Step, string> = {
  [Step.CHOIX_AMO]: "Choix AMO",
  [Step.ELIGIBILITE]: "Éligibilité",
  [Step.DIAGNOSTIC]: "Diagnostic",
  [Step.DEVIS]: "Devis",
  [Step.FACTURES]: "Factures",
};

/** Ordre des étapes */
const STEPS_ORDER: Step[] = [Step.CHOIX_AMO, Step.ELIGIBILITE, Step.DIAGNOSTIC, Step.DEVIS, Step.FACTURES];

/**
 * Récupère les statistiques complètes pour une entreprise AMO
 *
 * @param entrepriseAmoId - ID de l'entreprise AMO
 */
export async function getAmoStatistiques(entrepriseAmoId: string): Promise<AmoStatistiques> {
  const [indicateursCles, repartitionParEtape] = await Promise.all([
    getIndicateursCles(entrepriseAmoId),
    getRepartitionParEtape(entrepriseAmoId),
  ]);

  return {
    indicateursCles,
    repartitionParEtape,
  };
}

/**
 * Récupère les indicateurs clés pour une entreprise AMO
 *
 * @param entrepriseAmoId - ID de l'entreprise AMO
 */
async function getIndicateursCles(entrepriseAmoId: string): Promise<AmoIndicateursCles> {
  const [nombreDossiersEnCoursAccompagnement, demandesAccompagnement] = await Promise.all([
    getNombreDossiersEnCoursAccompagnement(entrepriseAmoId),
    getDemandesAccompagnement(entrepriseAmoId),
  ]);

  return {
    nombreDossiersEnCoursAccompagnement,
    nombreDemandesAccompagnement: demandesAccompagnement,
  };
}

/**
 * Compte le nombre de dossiers en cours d'accompagnement
 *
 * Un dossier est "en cours d'accompagnement" si :
 * - Le statut est LOGEMENT_ELIGIBLE (l'AMO a accepté et validé l'éligibilité du logement)
 */
async function getNombreDossiersEnCoursAccompagnement(entrepriseAmoId: string): Promise<number> {
  const result = await db
    .select({ count: count() })
    .from(parcoursAmoValidations)
    .where(
      and(
        eq(parcoursAmoValidations.entrepriseAmoId, entrepriseAmoId),
        eq(parcoursAmoValidations.statut, StatutValidationAmo.LOGEMENT_ELIGIBLE)
      )
    );

  return result[0]?.count ?? 0;
}

/**
 * Récupère les statistiques des demandes d'accompagnement
 *
 * Demandes acceptées = LOGEMENT_ELIGIBLE
 * Demandes refusées = LOGEMENT_NON_ELIGIBLE + ACCOMPAGNEMENT_REFUSE
 */
async function getDemandesAccompagnement(
  entrepriseAmoId: string
): Promise<{ total: number; acceptees: number; refusees: number }> {
  // Compter les demandes acceptées (LOGEMENT_ELIGIBLE)
  const accepteesResult = await db
    .select({ count: count() })
    .from(parcoursAmoValidations)
    .where(
      and(
        eq(parcoursAmoValidations.entrepriseAmoId, entrepriseAmoId),
        eq(parcoursAmoValidations.statut, StatutValidationAmo.LOGEMENT_ELIGIBLE)
      )
    );

  // Compter les demandes refusées (LOGEMENT_NON_ELIGIBLE ou ACCOMPAGNEMENT_REFUSE)
  const refuseesResult = await db
    .select({ count: count() })
    .from(parcoursAmoValidations)
    .where(
      and(
        eq(parcoursAmoValidations.entrepriseAmoId, entrepriseAmoId),
        or(
          eq(parcoursAmoValidations.statut, StatutValidationAmo.LOGEMENT_NON_ELIGIBLE),
          eq(parcoursAmoValidations.statut, StatutValidationAmo.ACCOMPAGNEMENT_REFUSE)
        )
      )
    );

  const acceptees = accepteesResult[0]?.count ?? 0;
  const refusees = refuseesResult[0]?.count ?? 0;

  return {
    total: acceptees + refusees,
    acceptees,
    refusees,
  };
}

/**
 * Récupère la répartition des dossiers par étape du parcours
 *
 * Compte uniquement les dossiers en cours d'accompagnement (LOGEMENT_ELIGIBLE)
 */
async function getRepartitionParEtape(entrepriseAmoId: string): Promise<RepartitionParEtape[]> {
  // Récupérer le count par étape pour les dossiers de cette entreprise AMO
  const results = await Promise.all(
    STEPS_ORDER.map(async (step) => {
      const result = await db
        .select({ count: count() })
        .from(parcoursPrevention)
        .innerJoin(parcoursAmoValidations, eq(parcoursPrevention.id, parcoursAmoValidations.parcoursId))
        .where(
          and(
            eq(parcoursAmoValidations.entrepriseAmoId, entrepriseAmoId),
            eq(parcoursAmoValidations.statut, StatutValidationAmo.LOGEMENT_ELIGIBLE),
            eq(parcoursPrevention.currentStep, step)
          )
        );

      return {
        etape: step,
        label: STEP_LABELS[step],
        count: result[0]?.count ?? 0,
      };
    })
  );

  return results;
}
