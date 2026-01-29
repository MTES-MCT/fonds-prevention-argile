import { db } from "@/shared/database/client";
import { parcoursAmoValidations, parcoursPrevention } from "@/shared/database/schema";
import { eq } from "drizzle-orm";
import type { DemandeDetail, InfoDemandeur, InfoLogement } from "../domain/types";
import type { ActionResult } from "@/shared/types/action-result.types";
import { getCurrentUser } from "@/features/auth/services/user.service";
import { UserRole } from "@/shared/domain/value-objects";
import { Step } from "@/shared/domain/value-objects/step.enum";
import { parseCoordinatesString } from "@/shared/utils/geo.utils";
import { calculerTrancheRevenu, isRegionIDF } from "@/features/simulateur/domain/types/rga-revenus.types";

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
    const coords = parseCoordinatesString(rgaData?.logement?.coordonnees);
    const niveauRevenu = calculateNiveauRevenuFromRga(rgaData);
    const logement: InfoLogement = {
      anneeConstruction: rgaData?.logement?.annee_de_construction || null,
      nombreNiveaux: rgaData?.logement?.niveaux?.toString() || null,
      etatMaison: rgaData?.rga?.sinistres || null,
      indemnisationPasseeRGA: rgaData?.rga?.indemnise_indemnise_rga || null,
      nombreHabitants: rgaData?.menage?.personnes || null,
      niveauRevenu,
      codeInsee: rgaData?.logement?.commune || null,
      lat: coords?.lat ?? null,
      lon: coords?.lon ?? null,
      rnbId: rgaData?.logement?.rnb || null,
    };

    const demandeDetail: DemandeDetail = {
      id: demande.validation.id,
      demandeur,
      logement,
      statut: demande.validation.statut,
      dateCreation: demande.validation.choisieAt,
      commentaire: demande.validation.commentaire,
      currentStep: demande.parcours.currentStep as Step,
      parcoursCreatedAt: demande.parcours.createdAt,
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
 * Calculer le niveau de revenu à partir des données RGA
 * Utilise les vrais barèmes France Rénov avec distinction IDF/hors IDF
 */
function calculateNiveauRevenuFromRga(
  rgaData: { menage?: { revenu_rga?: number; personnes?: number }; logement?: { code_region?: string } } | null | undefined
): string | null {
  const revenu = rgaData?.menage?.revenu_rga;
  const personnes = rgaData?.menage?.personnes;
  const codeRegion = rgaData?.logement?.code_region;

  // Vérification explicite pour éviter le bug avec revenu = 0 (qui est une valeur valide pour "très modeste")
  if (revenu === null || revenu === undefined || !personnes || !codeRegion) return null;

  const estIDF = isRegionIDF(codeRegion);
  const tranche = calculerTrancheRevenu(revenu, personnes, estIDF);

  // Capitaliser pour l'affichage
  return tranche.charAt(0).toUpperCase() + tranche.slice(1);
}
