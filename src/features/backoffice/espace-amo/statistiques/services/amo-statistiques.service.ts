import { count, eq, and, or } from "drizzle-orm";
import { db } from "@/shared/database/client";
import { parcoursAmoValidations } from "@/shared/database/schema";
import { StatutValidationAmo } from "@/shared/domain/value-objects/statut-validation-amo.enum";
import type { AmoIndicateursCles, AmoStatistiques } from "../domain/types";

/**
 * Service de statistiques pour l'espace AMO
 *
 * Fournit les indicateurs clés pour un AMO connecté
 */

/**
 * Récupère les statistiques complètes pour une entreprise AMO
 *
 * @param entrepriseAmoId - ID de l'entreprise AMO
 */
export async function getAmoStatistiques(entrepriseAmoId: string): Promise<AmoStatistiques> {
  const indicateursCles = await getIndicateursCles(entrepriseAmoId);

  return {
    indicateursCles,
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
