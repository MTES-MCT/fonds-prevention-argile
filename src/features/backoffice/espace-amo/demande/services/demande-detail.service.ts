import { db } from "@/shared/database/client";
import { parcoursAmoValidations, parcoursPrevention } from "@/shared/database/schema";
import { eq } from "drizzle-orm";
import type { DemandeDetail, InfoDemandeur, InfoLogement } from "../domain/types";
import type { ActionResult } from "@/shared/types/action-result.types";
import { getCurrentUser } from "@/features/auth/services/user.service";
import { UserRole } from "@/shared/domain/value-objects";

/**
 * Récupérer le détail d'une demande d'accompagnement par son ID
 * Vérifie que l'utilisateur connecté est bien l'AMO propriétaire
 */
export async function getDemandeDetail(demandeId: string): Promise<ActionResult<DemandeDetail>> {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return { success: false, error: "Non authentifié" };
    }

    // Les admins peuvent tout voir
    const isAdmin = user.role === UserRole.SUPER_ADMINISTRATEUR || user.role === UserRole.ADMINISTRATEUR;

    // Récupérer la demande avec les données du parcours
    const [demande] = await db
      .select({
        validation: parcoursAmoValidations,
        parcours: parcoursPrevention,
      })
      .from(parcoursAmoValidations)
      .innerJoin(parcoursPrevention, eq(parcoursAmoValidations.parcoursId, parcoursPrevention.id))
      .where(eq(parcoursAmoValidations.id, demandeId))
      .limit(1);

    if (!demande) {
      return { success: false, error: "Demande non trouvée" };
    }

    // Vérifier que l'AMO est propriétaire de la demande (sauf admins)
    if (!isAdmin) {
      if (user.role !== UserRole.AMO) {
        return { success: false, error: "Accès réservé aux AMO" };
      }

      if (!user.entrepriseAmoId) {
        return { success: false, error: "Votre compte AMO n'est pas configuré" };
      }

      if (demande.validation.entrepriseAmoId !== user.entrepriseAmoId) {
        return { success: false, error: "Cette demande ne vous est pas destinée" };
      }
    }

    // Construire l'objet InfoDemandeur
    const demandeur: InfoDemandeur = {
      prenom: demande.validation.userPrenom,
      nom: demande.validation.userNom,
      email: demande.validation.userEmail,
      telephone: demande.validation.userTelephone,
      adresse: demande.validation.adresseLogement,
    };

    // Construire l'objet InfoLogement à partir de RGASimulationData
    const rgaData = demande.parcours.rgaSimulationData;
    const logement: InfoLogement = {
      anneeConstruction: rgaData?.logement?.annee_de_construction || null,
      nombreNiveaux: rgaData?.logement?.niveaux?.toString() || null,
      etatMaison: rgaData?.rga?.sinistres || null,
      indemnisationPasseeRGA: rgaData?.rga?.indemnise_indemnise_rga || null,
      nombreHabitants: rgaData?.menage?.personnes || null,
      niveauRevenu: calculateNiveauRevenu(rgaData?.menage?.revenu_rga, rgaData?.menage?.personnes),
      codeInsee: rgaData?.logement?.commune || null,
      lat: extractLatitude(rgaData?.logement?.coordonnees),
      lon: extractLongitude(rgaData?.logement?.coordonnees),
      rnbId: rgaData?.logement?.rnb || null,
    };

    const demandeDetail: DemandeDetail = {
      id: demande.validation.id,
      demandeur,
      logement,
      statut: demande.validation.statut,
      dateCreation: demande.validation.choisieAt,
      commentaire: demande.validation.commentaire,
    };

    return { success: true, data: demandeDetail };
  } catch (error) {
    console.error("Erreur getDemandeDetail:", error);
    return {
      success: false,
      error: "Erreur lors de la récupération de la demande",
    };
  }
}

/**
 * Calculer le niveau de revenu selon les plafonds (à adapter selon les vrais plafonds)
 */
function calculateNiveauRevenu(revenu: number | undefined, personnes: number | undefined): string | null {
  if (!revenu || !personnes) return null;

  // Plafonds à titre d'exemple (à adapter selon les vrais plafonds du fonds)
  const plafondsModeste: Record<number, number> = {
    1: 25068,
    2: 36792,
    3: 44188,
    4: 51597,
    5: 59026,
  };

  const plafondsTresModeste: Record<number, number> = {
    1: 17400,
    2: 25514,
    3: 30676,
    4: 35797,
    5: 40918,
  };

  const plafondTresModeste = plafondsTresModeste[personnes] || plafondsTresModeste[5];
  const plafondModeste = plafondsModeste[personnes] || plafondsModeste[5];

  if (revenu <= plafondTresModeste) {
    return "Très modeste";
  } else if (revenu <= plafondModeste) {
    return "Modeste";
  } else if (revenu <= plafondModeste * 1.5) {
    return "Intermédiaire";
  } else {
    return "Supérieur";
  }
}

/**
 * Extraire la latitude d'une chaîne de coordonnées "lat,lon"
 */
function extractLatitude(coordonnees: string | undefined): number | null {
  if (!coordonnees) return null;
  const parts = coordonnees.split(",");
  return parts.length >= 2 ? parseFloat(parts[0]) : null;
}

/**
 * Extraire la longitude d'une chaîne de coordonnées "lat,lon"
 */
function extractLongitude(coordonnees: string | undefined): number | null {
  if (!coordonnees) return null;
  const parts = coordonnees.split(",");
  return parts.length >= 2 ? parseFloat(parts[1]) : null;
}
