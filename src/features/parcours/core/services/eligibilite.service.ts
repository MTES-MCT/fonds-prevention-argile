import type { ActionResult } from "@/shared/types";
import { Step } from "../domain/value-objects/step";
import { RGAFormData } from "@/features/simulateur-rga";
import { getParcoursComplet } from "./parcours-state.service";
import {
  mapRGAToDSFormat,
  validateRGADataForDS,
} from "../../dossiers-ds/mappers/rga-to-ds.mapper";
import { Status } from "../domain";
import { getAmoChoisie } from "../../amo/actions";
import { prefillClient } from "../../dossiers-ds/adapters";
import { createDossierForCurrentStep } from "../../dossiers-ds/services";
import { parcoursRepo } from "@/shared/database";

/**
 * Service de gestion de l'éligibilité
 */

interface EligibiliteResult {
  dossierUrl: string;
  dossierNumber: number;
  dossierId: string;
  message: string;
}

/**
 * Crée un dossier d'éligibilité avec les données RGA
 */
export async function createEligibiliteDossier(
  userId: string,
  rgaData: Partial<RGAFormData>
): Promise<ActionResult<EligibiliteResult>> {
  try {
    // 1. Valider les données RGA
    const validation = validateRGADataForDS(rgaData);

    if (!validation.isValid) {
      return {
        success: false,
        error: `Données RGA incomplètes: ${validation.errors.join(", ")}`,
      };
    }

    // 2. Récupérer le parcours
    const parcoursData = await getParcoursComplet(userId);
    if (!parcoursData) {
      return { success: false, error: "Parcours non trouvé" };
    }

    // Vérifier qu'on est bien à l'étape ELIGIBILITE
    if (parcoursData.parcours.currentStep !== Step.ELIGIBILITE) {
      return {
        success: false,
        error: "Vous n'êtes pas à l'étape d'éligibilité",
      };
    }

    // Vérifier que le statut permet la création (TODO ou EN_INSTRUCTION)
    if (
      parcoursData.parcours.status !== Status.TODO &&
      parcoursData.parcours.status !== Status.EN_INSTRUCTION
    ) {
      return {
        success: false,
        error: "Un dossier existe déjà pour cette étape",
      };
    }

    // 3. Récupérer l'AMO choisie
    const amoResult = await getAmoChoisie();
    if (!amoResult.success || !amoResult.data) {
      return {
        success: false,
        error: "Aucune AMO sélectionnée. Veuillez d'abord choisir une AMO.",
      };
    }

    const amo = amoResult.data;

    // 4. Mapper RGA → DS avec ajout des infos AMO
    const prefillData = mapRGAToDSFormat(rgaData);

    // Ajouter les informations de l'AMO au prefill
    // (à adapter selon les champs disponibles dans votre formulaire DS)
    prefillData.champ_amo_nom = amo.nom;
    prefillData.champ_amo_siret = amo.siret;
    prefillData.champ_amo_email = amo.emails.split(";")[0].trim();
    if (amo.telephone) {
      prefillData.champ_amo_telephone = amo.telephone;
    }
    if (amo.adresse) {
      prefillData.champ_amo_adresse = amo.adresse;
    }

    // 5. Créer le dossier DS via l'API
    const createResponse = await prefillClient.createPrefillDossier(
      prefillData,
      Step.ELIGIBILITE
    );

    if (!createResponse.dossier_url || !createResponse.dossier_number) {
      return {
        success: false,
        error: "Réponse invalide de Démarches Simplifiées",
      };
    }

    // 6. Récupérer l'ID de la démarche
    const demarcheId = prefillClient.getDemarcheId(Step.ELIGIBILITE);

    // 7. Enregistrer dans le parcours
    const dossierResult = await createDossierForCurrentStep(
      userId,
      parcoursData.parcours.id,
      Step.ELIGIBILITE,
      {
        dsNumber: createResponse.dossier_number.toString(),
        dsDemarcheId: demarcheId,
        dsUrl: createResponse.dossier_url,
      }
    );

    if (!dossierResult.success) {
      return {
        success: false,
        error: "Erreur lors de l'enregistrement du dossier",
      };
    }

    // 8. Mettre à jour le statut du parcours à TODO
    await parcoursRepo.updateStatus(parcoursData.parcours.id, Status.TODO);

    return {
      success: true,
      data: {
        dossierUrl: createResponse.dossier_url,
        dossierNumber: createResponse.dossier_number,
        dossierId: dossierResult.data.dossierId,
        message: "Dossier d'éligibilité créé avec succès",
      },
    };
  } catch (error) {
    console.error("Erreur createEligibiliteDossier:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Erreur lors de la création du dossier d'éligibilité",
    };
  }
}

/**
 * Vérifie si l'utilisateur peut créer un dossier d'éligibilité
 */
export async function canCreateEligibiliteDossier(
  userId: string
): Promise<boolean> {
  const parcours = await getParcoursComplet(userId);

  // Ne peut pas créer si déjà à l'étape éligibilité ou plus loin
  if (parcours?.parcours?.currentStep === Step.ELIGIBILITE) {
    return false;
  }

  return true;
}
