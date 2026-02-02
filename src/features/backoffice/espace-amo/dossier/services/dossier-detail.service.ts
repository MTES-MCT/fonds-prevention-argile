import { db } from "@/shared/database/client";
import {
  parcoursAmoValidations,
  parcoursPrevention,
  dossiersDemarchesSimplifiees,
} from "@/shared/database/schema";
import { eq, and } from "drizzle-orm";
import type { DossierDetail, InfoDemandeur, InfoLogement, ParcoursDateProgression } from "../domain/types";
import type { ActionResult } from "@/shared/types/action-result.types";
import { getCurrentUser } from "@/features/auth/services/user.service";
import { UserRole } from "@/shared/domain/value-objects";
import { StatutValidationAmo } from "@/shared/domain/value-objects/statut-validation-amo.enum";
import { Step } from "@/shared/domain/value-objects/step.enum";
import { Status } from "@/shared/domain/value-objects/status.enum";
import { parseCoordinatesString } from "@/shared/utils/geo.utils";
import { calculerTrancheRevenu, isRegionIDF } from "@/features/simulateur/domain/types/rga-revenus.types";
import { dossierDemarchesSimplifieesRepository } from "@/shared/database/repositories/dossiers-demarches-simplifiees.repository";

/**
 * Récupérer le détail d'un dossier suivi par son ID
 * Vérifie que l'utilisateur connecté est bien l'AMO propriétaire
 * et que le dossier est bien en statut LOGEMENT_ELIGIBLE
 */
export async function getDossierDetail(dossierId: string): Promise<ActionResult<DossierDetail>> {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return { success: false, error: "Non authentifié" };
    }

    // Les admins peuvent tout voir
    const isAdmin = user.role === UserRole.SUPER_ADMINISTRATEUR || user.role === UserRole.ADMINISTRATEUR;

    // Récupérer le dossier avec les données du parcours
    const [dossier] = await db
      .select({
        validation: parcoursAmoValidations,
        parcours: parcoursPrevention,
      })
      .from(parcoursAmoValidations)
      .innerJoin(parcoursPrevention, eq(parcoursAmoValidations.parcoursId, parcoursPrevention.id))
      .where(eq(parcoursAmoValidations.id, dossierId))
      .limit(1);

    if (!dossier) {
      return { success: false, error: "Dossier non trouvé" };
    }

    // Vérifier que c'est bien un dossier suivi (statut LOGEMENT_ELIGIBLE)
    if (dossier.validation.statut !== StatutValidationAmo.LOGEMENT_ELIGIBLE) {
      return { success: false, error: "Ce dossier n'est pas un dossier suivi" };
    }

    // Vérifier que l'AMO est propriétaire du dossier (sauf admins)
    if (!isAdmin) {
      if (user.role !== UserRole.AMO) {
        return { success: false, error: "Accès réservé aux AMO" };
      }

      if (!user.entrepriseAmoId) {
        return { success: false, error: "Votre compte AMO n'est pas configuré" };
      }

      if (dossier.validation.entrepriseAmoId !== user.entrepriseAmoId) {
        return { success: false, error: "Ce dossier ne vous est pas destiné" };
      }
    }

    // Récupérer le statut DS de l'étape courante
    const [dossierDS] = await db
      .select({ dsStatus: dossiersDemarchesSimplifiees.dsStatus })
      .from(dossiersDemarchesSimplifiees)
      .where(
        and(
          eq(dossiersDemarchesSimplifiees.parcoursId, dossier.validation.parcoursId),
          eq(dossiersDemarchesSimplifiees.step, dossier.parcours.currentStep)
        )
      )
      .limit(1);

    // Construire l'objet InfoDemandeur
    const demandeur: InfoDemandeur = {
      prenom: dossier.validation.userPrenom,
      nom: dossier.validation.userNom,
      email: dossier.validation.userEmail,
      telephone: dossier.validation.userTelephone,
      adresse: dossier.validation.adresseLogement,
    };

    // Construire l'objet InfoLogement à partir de RGASimulationData
    const rgaData = dossier.parcours.rgaSimulationData;
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
    const datesByStep = await dossierDemarchesSimplifieesRepository.getSubmittedDatesByStep(dossier.parcours.id);

    // Construire l'objet des dates de progression
    const dates: ParcoursDateProgression = {
      compteCreatedAt: dossier.parcours.createdAt,
      amoChoisieAt: dossier.validation.choisieAt,
      eligibiliteSubmittedAt: datesByStep.get(Step.ELIGIBILITE),
      diagnosticSubmittedAt: datesByStep.get(Step.DIAGNOSTIC),
      devisSubmittedAt: datesByStep.get(Step.DEVIS),
      facturesSubmittedAt: datesByStep.get(Step.FACTURES),
    };

    const dossierDetail: DossierDetail = {
      id: dossier.validation.id,
      demandeur,
      logement,
      currentStep: dossier.parcours.currentStep as Step,
      currentStatus: dossier.parcours.currentStatus as Status,
      dsStatus: dossierDS?.dsStatus ?? null,
      parcoursCreatedAt: dossier.parcours.createdAt,
      lastUpdatedAt: dossier.parcours.updatedAt,
      suiviDepuis: dossier.validation.valideeAt!,
      dates,
    };

    return { success: true, data: dossierDetail };
  } catch (error) {
    console.error("Erreur getDossierDetail:", error);
    return {
      success: false,
      error: "Erreur lors de la récupération du dossier",
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

  if (!revenu || !personnes || !codeRegion) return null;

  const estIDF = isRegionIDF(codeRegion);
  const tranche = calculerTrancheRevenu(revenu, personnes, estIDF);

  // Capitaliser pour l'affichage
  return tranche.charAt(0).toUpperCase() + tranche.slice(1);
}
