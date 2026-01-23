import { count, eq, and, asc } from "drizzle-orm";
import { db } from "@/shared/database/client";
import {
  parcoursAmoValidations,
  parcoursPrevention,
  dossiersDemarchesSimplifiees,
} from "@/shared/database/schema";
import { StatutValidationAmo } from "@/shared/domain/value-objects/statut-validation-amo.enum";
import type { AmoDossiersData, DossierSuivi } from "../domain/types";

/**
 * Service pour la page des dossiers de l'espace AMO
 *
 * Fournit les données pour afficher les dossiers suivis (demandes acceptées)
 */

/**
 * Récupère les données complètes pour la page des dossiers de l'espace AMO
 *
 * @param entrepriseAmoId - ID de l'entreprise AMO
 */
export async function getAmoDossiersData(entrepriseAmoId: string): Promise<AmoDossiersData> {
  const [nombreDossiersSuivis, dossiers] = await Promise.all([
    getNombreDossiersSuivis(entrepriseAmoId),
    getDossiersSuivis(entrepriseAmoId),
  ]);

  return {
    nombreDossiersSuivis,
    dossiers,
  };
}

/**
 * Compte le nombre de dossiers suivis (demandes acceptées)
 *
 * Un dossier est "suivi" si son statut est LOGEMENT_ELIGIBLE
 */
async function getNombreDossiersSuivis(entrepriseAmoId: string): Promise<number> {
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
 * Récupère la liste des dossiers suivis avec leurs informations
 *
 * Retourne les dossiers avec statut LOGEMENT_ELIGIBLE, triés par date de validation croissante
 * (les plus anciens en premier)
 */
async function getDossiersSuivis(entrepriseAmoId: string): Promise<DossierSuivi[]> {
  // Récupère les dossiers suivis avec les infos du parcours
  const results = await db
    .select({
      id: parcoursAmoValidations.id,
      prenom: parcoursAmoValidations.userPrenom,
      nom: parcoursAmoValidations.userNom,
      valideeAt: parcoursAmoValidations.valideeAt,
      parcoursId: parcoursAmoValidations.parcoursId,
      rgaSimulationData: parcoursPrevention.rgaSimulationData,
      currentStep: parcoursPrevention.currentStep,
      currentStatus: parcoursPrevention.currentStatus,
    })
    .from(parcoursAmoValidations)
    .innerJoin(parcoursPrevention, eq(parcoursPrevention.id, parcoursAmoValidations.parcoursId))
    .where(
      and(
        eq(parcoursAmoValidations.entrepriseAmoId, entrepriseAmoId),
        eq(parcoursAmoValidations.statut, StatutValidationAmo.LOGEMENT_ELIGIBLE)
      )
    )
    .orderBy(asc(parcoursAmoValidations.valideeAt));

  // Pour chaque dossier, récupère le dsStatus de l'étape courante
  const dossiersWithDsStatus = await Promise.all(
    results.map(async (row) => {
      // Récupère le dossier DS de l'étape courante
      const dossierDS = await db
        .select({ dsStatus: dossiersDemarchesSimplifiees.dsStatus })
        .from(dossiersDemarchesSimplifiees)
        .where(
          and(
            eq(dossiersDemarchesSimplifiees.parcoursId, row.parcoursId),
            eq(dossiersDemarchesSimplifiees.step, row.currentStep)
          )
        )
        .limit(1);

      return {
        id: row.id,
        prenom: row.prenom,
        nom: row.nom,
        commune: row.rgaSimulationData?.logement?.commune_nom ?? null,
        codeDepartement: row.rgaSimulationData?.logement?.code_departement ?? null,
        etape: row.currentStep,
        statut: row.currentStatus,
        dsStatus: dossierDS[0]?.dsStatus ?? null,
        dateValidation: row.valideeAt!,
      };
    })
  );

  return dossiersWithDsStatus;
}
