import { count, eq, and, asc } from "drizzle-orm";
import { db } from "@/shared/database/client";
import { parcoursAmoValidations, parcoursPrevention } from "@/shared/database/schema";
import { StatutValidationAmo } from "@/shared/domain/value-objects/statut-validation-amo.enum";
import type { AmoAccueilData, DemandeAccompagnement } from "../domain/types";

/**
 * Service pour la page d'accueil de l'espace AMO
 *
 * Fournit les données nécessaires à l'affichage de l'accueil
 */

/**
 * Récupère les données complètes pour la page d'accueil de l'espace AMO
 *
 * @param entrepriseAmoId - ID de l'entreprise AMO
 */
export async function getAmoAccueilData(entrepriseAmoId: string): Promise<AmoAccueilData> {
  const [nombreDemandesEnAttente, nombreDossiersSuivis, demandesATraiter] = await Promise.all([
    getNombreDemandesEnAttente(entrepriseAmoId),
    getNombreDossiersSuivis(entrepriseAmoId),
    getDemandesATraiter(entrepriseAmoId),
  ]);

  return {
    nombreDemandesEnAttente,
    nombreDossiersSuivis,
    demandesATraiter,
  };
}

/**
 * Compte le nombre de demandes d'accompagnement en attente
 *
 * Une demande est "en attente" si son statut est EN_ATTENTE
 */
async function getNombreDemandesEnAttente(entrepriseAmoId: string): Promise<number> {
  const result = await db
    .select({ count: count() })
    .from(parcoursAmoValidations)
    .where(
      and(
        eq(parcoursAmoValidations.entrepriseAmoId, entrepriseAmoId),
        eq(parcoursAmoValidations.statut, StatutValidationAmo.EN_ATTENTE)
      )
    );

  return result[0]?.count ?? 0;
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
 * Récupère la liste des demandes d'accompagnement à traiter
 *
 * Retourne les demandes avec statut EN_ATTENTE, triées par date de création croissante
 * (les plus anciennes en premier pour inciter à les traiter en priorité)
 */
async function getDemandesATraiter(entrepriseAmoId: string): Promise<DemandeAccompagnement[]> {
  const results = await db
    .select({
      id: parcoursAmoValidations.id,
      prenom: parcoursAmoValidations.userPrenom,
      nom: parcoursAmoValidations.userNom,
      createdAt: parcoursAmoValidations.createdAt,
      rgaSimulationData: parcoursPrevention.rgaSimulationData,
    })
    .from(parcoursAmoValidations)
    .innerJoin(parcoursPrevention, eq(parcoursPrevention.id, parcoursAmoValidations.parcoursId))
    .where(
      and(
        eq(parcoursAmoValidations.entrepriseAmoId, entrepriseAmoId),
        eq(parcoursAmoValidations.statut, StatutValidationAmo.EN_ATTENTE)
      )
    )
    .orderBy(asc(parcoursAmoValidations.createdAt));

  return results.map((row) => ({
    id: row.id,
    prenom: row.prenom,
    nom: row.nom,
    commune: row.rgaSimulationData?.logement?.commune_nom ?? null,
    codePostal: row.rgaSimulationData?.logement?.code_departement ?? null,
    dateCreation: row.createdAt,
  }));
}
