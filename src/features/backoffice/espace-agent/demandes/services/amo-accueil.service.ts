import { count, eq, and, asc } from "drizzle-orm";
import { db } from "@/shared/database/client";
import { parcoursAmoValidations, parcoursPrevention, users } from "@/shared/database/schema";
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
/**
 * @param entrepriseAmoId - ID de l'entreprise AMO, ou `null` pour un accès global (SUPER_ADMIN lecture seule)
 */
export async function getAmoAccueilData(entrepriseAmoId: string | null): Promise<AmoAccueilData> {
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

function entrepriseAmoFilter(entrepriseAmoId: string | null) {
  return entrepriseAmoId ? eq(parcoursAmoValidations.entrepriseAmoId, entrepriseAmoId) : undefined;
}

async function getNombreDemandesEnAttente(entrepriseAmoId: string | null): Promise<number> {
  const result = await db
    .select({ count: count() })
    .from(parcoursAmoValidations)
    .where(
      and(entrepriseAmoFilter(entrepriseAmoId), eq(parcoursAmoValidations.statut, StatutValidationAmo.EN_ATTENTE))
    );

  return result[0]?.count ?? 0;
}

async function getNombreDossiersSuivis(entrepriseAmoId: string | null): Promise<number> {
  const result = await db
    .select({ count: count() })
    .from(parcoursAmoValidations)
    .where(
      and(
        entrepriseAmoFilter(entrepriseAmoId),
        eq(parcoursAmoValidations.statut, StatutValidationAmo.LOGEMENT_ELIGIBLE)
      )
    );

  return result[0]?.count ?? 0;
}

async function getDemandesATraiter(entrepriseAmoId: string | null): Promise<DemandeAccompagnement[]> {
  const results = await db
    .select({
      id: parcoursAmoValidations.id,
      prenom: parcoursAmoValidations.userPrenom,
      nom: parcoursAmoValidations.userNom,
      userPrenom: users.prenom,
      userNom: users.nom,
      createdAt: parcoursAmoValidations.createdAt,
      rgaSimulationData: parcoursPrevention.rgaSimulationData,
    })
    .from(parcoursAmoValidations)
    .innerJoin(parcoursPrevention, eq(parcoursPrevention.id, parcoursAmoValidations.parcoursId))
    .innerJoin(users, eq(users.id, parcoursPrevention.userId))
    .where(
      and(entrepriseAmoFilter(entrepriseAmoId), eq(parcoursAmoValidations.statut, StatutValidationAmo.EN_ATTENTE))
    )
    .orderBy(asc(parcoursAmoValidations.createdAt));

  return results.map((row) => ({
    id: row.id,
    prenom: row.prenom || row.userPrenom,
    nom: row.nom || row.userNom,
    commune: row.rgaSimulationData?.logement?.commune_nom ?? null,
    codePostal: row.rgaSimulationData?.logement?.code_departement ?? null,
    dateCreation: row.createdAt,
  }));
}
