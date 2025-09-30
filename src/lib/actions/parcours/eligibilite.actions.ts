"use server";

import { getSession } from "@/lib/auth/services/auth.service";
import {
  mapRGAToDSFormat,
  validateRGADataForDS,
} from "@/lib/services/rga-to-ds.mapper";
import { creerDossier } from "@/lib/actions/parcours/parcours.actions";
import type { ActionResult } from "@/lib/actions/types";
import type { RGAFormData } from "@/lib/form-rga/types";
import { createPrefillDossier } from "../demarches-simplifies";
import { getParcoursComplet } from "@/lib/database/services";
import { Step } from "@/lib/parcours/parcours.types";
import { prefillClient } from "@/lib/api/demarches-simplifiees/rest";
import { getDemarcheUrl } from "@/lib/parcours/demarches.helpers";

interface EligibiliteResult {
  dossierUrl: string;
  dossierNumber: number;
  dossierId: string;
  message: string;
}

/**
 * Envoie les données d'éligibilité vers Démarches Simplifiées
 * et crée le dossier dans le parcours
 *
 * @param rgaData - Les données RGA passées depuis le client
 */
export async function envoyerDossierEligibiliteAvecDonnees(
  rgaData: Partial<RGAFormData>
): Promise<ActionResult<EligibiliteResult>> {
  try {
    // 1. Vérifier l'authentification
    const session = await getSession();
    if (!session?.userId) {
      return {
        success: false,
        error: "Vous devez être connecté pour envoyer votre dossier",
      };
    }

    // 2. Valider les données
    const validation = validateRGADataForDS(rgaData);
    if (!validation.isValid) {
      return {
        success: false,
        error: `Données incomplètes: ${validation.errors.join(", ")}`,
      };
    }

    // 3. Transformer les données au format DS
    const prefillData = mapRGAToDSFormat(rgaData);

    console.log(
      "Envoi vers DS avec",
      Object.keys(prefillData).length,
      "champs"
    );

    // 4. Créer le dossier prérempli dans DS
    const dsResult = await createPrefillDossier(
      prefillData,
      Step.ELIGIBILITE,
      rgaData
    );

    if (!dsResult.success || !dsResult.data) {
      return {
        success: false,
        error: !dsResult.success
          ? dsResult.error
          : "Erreur lors de la création du dossier DS",
      };
    }

    // 5. Enregistrer le dossier dans le parcours
    const parcoursResult = await creerDossier(
      dsResult.data.dossier_number.toString(),
      prefillClient.getDemarcheId(Step.ELIGIBILITE),
      getDemarcheUrl(dsResult.data.dossier_number.toString())
    );

    if (!parcoursResult.success) {
      console.error(
        "Dossier DS créé mais erreur parcours:",
        parcoursResult.error
      );
      // On continue quand même, le dossier DS est créé
    }

    console.log("Dossier créé avec succès:", {
      numero: dsResult.data.dossier_number,
      url: dsResult.data.dossier_url,
    });

    return {
      success: true,
      data: {
        dossierUrl: dsResult.data.dossier_url,
        dossierNumber: dsResult.data.dossier_number,
        dossierId: dsResult.data.dossier_id,
        message:
          "Votre dossier a été créé avec succès. Vous allez être redirigé vers le formulaire.",
      },
    };
  } catch (error) {
    console.error("Erreur envoi éligibilité:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Erreur lors de l'envoi du dossier",
    };
  }
}

/**
 * Vérifie si l'utilisateur peut créer un dossier d'éligibilité
 * (utilisé pour conditionner l'affichage du bouton)
 */
export async function peutCreerDossierEligibilite(): Promise<
  ActionResult<boolean>
> {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return {
        success: true,
        data: false,
      };
    }

    // Vérifier que l'utilisateur n'est pas déjà à l'étape d'éligibilité
    const parcours = await getParcoursComplet(session.userId);
    if (parcours?.parcours?.currentStep === Step.ELIGIBILITE) {
      return { success: true, data: false };
    }

    return {
      success: true,
      data: true,
    };
  } catch (error) {
    return {
      success: false,
      error:
        "Erreur lors de la vérification " +
        (error instanceof Error ? error.message : "inconnue"),
    };
  }
}
