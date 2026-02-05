import { db } from "@/shared/database/client";
import { parcoursAmoValidations, parcoursPrevention } from "@/shared/database/schema";
import { eq } from "drizzle-orm";
import type { DemandeDetail, InfoDemandeur, InfoLogement, ParcoursDateProgression } from "../domain/types";
import type { ActionResult } from "@/shared/types/action-result.types";
import { getCurrentUser } from "@/features/auth/services/user.service";
import { UserRole } from "@/shared/domain/value-objects";
import { Step } from "@/shared/domain/value-objects/step.enum";
import { parseCoordinatesString } from "@/shared/utils/geo.utils";
import { calculateNiveauRevenuFromRga } from "@/features/simulateur/domain/types/rga-revenus.types";
import { dossierDemarchesSimplifieesRepository } from "@/shared/database/repositories/dossiers-demarches-simplifiees.repository";

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
      const canAccessDemandes = user.role === UserRole.AMO || user.role === UserRole.AMO_ET_ALLERS_VERS;

      if (!canAccessDemandes) {
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
      zoneExposition: rgaData?.logement?.zone_dexposition || null,
      indemnisationPasseeRGA: rgaData?.rga?.indemnise_indemnise_rga ?? null,
      indemnisationAvantJuillet2025: rgaData?.rga?.indemnise_avant_juillet_2025 ?? null,
      indemnisationAvantJuillet2015: rgaData?.rga?.indemnise_avant_juillet_2015 ?? null,
      montantIndemnisation: rgaData?.rga?.indemnise_montant_indemnite ?? null,
      nombreHabitants: rgaData?.menage?.personnes || null,
      niveauRevenu,
      codeInsee: rgaData?.logement?.commune || null,
      lat: coords?.lat ?? null,
      lon: coords?.lon ?? null,
      rnbId: rgaData?.logement?.rnb || null,
    };

    // Récupérer les dates de soumission des dossiers DS par step
    const datesByStep = await dossierDemarchesSimplifieesRepository.getSubmittedDatesByStep(demande.parcours.id);

    // Construire l'objet des dates de progression
    const dates: ParcoursDateProgression = {
      compteCreatedAt: demande.parcours.createdAt,
      amoChoisieAt: demande.validation.choisieAt,
      eligibiliteSubmittedAt: datesByStep.get(Step.ELIGIBILITE),
      diagnosticSubmittedAt: datesByStep.get(Step.DIAGNOSTIC),
      devisSubmittedAt: datesByStep.get(Step.DEVIS),
      facturesSubmittedAt: datesByStep.get(Step.FACTURES),
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
      dates,
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

