import type { ActionResult } from "@/shared/types";
import { Step } from "../domain/value-objects/step";
import { getParcoursComplet } from "./parcours-state.service";
import { mapRGAToDSFormat, validateRGADataForDS } from "../../dossiers-ds/mappers/rga-to-ds.mapper";
import { Status } from "../domain";
import { getAmoChoisie } from "../../amo/actions";
import { prefillClient } from "../../dossiers-ds/adapters";
import { createDossierForCurrentStep } from "../../dossiers-ds/services";
import { parcoursRepo } from "@/shared/database";
import { DS_FIELDS_ELIGIBILITE } from "../../dossiers-ds/domain";
import { createDebugLogger } from "@/shared/utils";
import { PartialRGASimulationData } from "@/features/simulateur";

const debug = createDebugLogger("ELIGIBILITE");

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
  rgaData: PartialRGASimulationData
): Promise<ActionResult<EligibiliteResult>> {
  try {
    debug.log("=== DÉBUT CRÉATION DOSSIER ÉLIGIBILITÉ ===");
    debug.log("User ID:", userId);
    debug.log("Données RGA reçues:", JSON.stringify(rgaData, null, 2));

    // 1. Valider les données RGA
    const validation = validateRGADataForDS(rgaData);

    debug.log("Validation des données RGA:");
    debug.log("  Valide:", validation.isValid);
    if (validation.errors.length > 0) {
      console.error("  Erreurs:", validation.errors);
    }
    if (validation.warnings.length > 0) {
      console.warn("  Warnings:", validation.warnings);
    }

    if (!validation.isValid) {
      return {
        success: false,
        error: `Données RGA incomplètes: ${validation.errors.join(", ")}`,
      };
    }

    // 2. Récupérer le parcours
    const parcoursData = await getParcoursComplet(userId);
    if (!parcoursData) {
      console.error("Parcours non trouvé pour l'utilisateur");
      return { success: false, error: "Parcours non trouvé" };
    }

    debug.log("Parcours trouvé:", {
      id: parcoursData.parcours.id,
      currentStep: parcoursData.parcours.currentStep,
      status: parcoursData.parcours.status,
    });

    // Vérifier qu'on est bien à l'étape ELIGIBILITE
    if (parcoursData.parcours.currentStep !== Step.ELIGIBILITE) {
      console.error("Étape incorrecte:", parcoursData.parcours.currentStep, "!== ELIGIBILITE");
      return {
        success: false,
        error: "Vous n'êtes pas à l'étape d'éligibilité",
      };
    }

    // Vérifier que le statut permet la création (TODO ou EN_INSTRUCTION)
    if (parcoursData.parcours.status !== Status.TODO && parcoursData.parcours.status !== Status.EN_INSTRUCTION) {
      console.error("Statut incorrect:", parcoursData.parcours.status);
      return {
        success: false,
        error: "Un dossier existe déjà pour cette étape",
      };
    }

    // 3. Récupérer l'AMO choisie
    debug.log("Récupération de l'AMO choisie...");
    const amoResult = await getAmoChoisie();
    if (!amoResult.success || !amoResult.data) {
      console.error("Aucune AMO sélectionnée");
      return {
        success: false,
        error: "Aucune AMO sélectionnée. Veuillez d'abord choisir une AMO.",
      };
    }

    const amo = amoResult.data;
    debug.log("AMO choisie:", {
      nom: amo.nom,
      siret: amo.siret,
      email: amo.emails.split(";")[0].trim(),
    });

    // 4. Mapper RGA → DS avec ajout des infos AMO
    debug.log("Mapping RGA → DS...");
    const prefillData = mapRGAToDSFormat(rgaData);

    // Ajouter les informations de l'AMO au prefill
    prefillData[`champ_Q2hhbXAtNTQxOTQyOQ==`] = amo.siret;
    prefillData[`champ_Q2hhbXAtNTQxOTQzMg==`] = amo.adresse;
    prefillData.champ_amo_email = amo.emails.split(";")[0].trim();
    if (amo.telephone) {
      prefillData.champ_amo_telephone = amo.telephone;
    }
    if (amo.adresse) {
      prefillData.champ_amo_adresse = amo.adresse;
    }

    // Logger tous les champs mappés
    debug.log("Données mappées pour DS (prefill):");
    debug.log("  Nombre de champs:", Object.keys(prefillData).length);
    debug.log("  Champs mappés:");
    Object.entries(prefillData).forEach(([key, value]) => {
      const valueStr = typeof value === "object" ? JSON.stringify(value) : String(value);

      // Extraire l'ID du champ (enlever le préfixe "champ_")
      const fieldId = key.replace(/^champ_/, "");

      // Chercher le label dans DS_FIELDS_ELIGIBILITE
      const field = DS_FIELDS_ELIGIBILITE[fieldId];
      const label = field?.label || "Champ personnalisé AMO";

      debug.log(`    - ${label}`);
      debug.log(`      ID: ${fieldId}`);
      debug.log(`      Valeur: ${valueStr}`);
    });

    // 5. Créer le dossier DS via l'API
    debug.log("Envoi à Démarches Simplifiées...");
    const createResponse = await prefillClient.createPrefillDossier(prefillData, Step.ELIGIBILITE);

    debug.log("Réponse de DS:", {
      dossier_url: createResponse.dossier_url,
      dossier_number: createResponse.dossier_number,
      dossier_id: createResponse.dossier_id,
    });

    if (!createResponse.dossier_url || !createResponse.dossier_number) {
      console.error("Réponse DS invalide:", createResponse);
      return {
        success: false,
        error: "Réponse invalide de Démarches Simplifiées",
      };
    }

    // 6. Récupérer l'ID de la démarche
    const demarcheId = prefillClient.getDemarcheId(Step.ELIGIBILITE);
    debug.log("Démarche ID:", demarcheId);

    // 7. Enregistrer dans le parcours
    debug.log("Enregistrement du dossier en base...");
    const dossierResult = await createDossierForCurrentStep(userId, parcoursData.parcours.id, Step.ELIGIBILITE, {
      dsNumber: createResponse.dossier_number.toString(),
      dsDemarcheId: demarcheId,
      dsUrl: createResponse.dossier_url,
    });

    if (!dossierResult.success) {
      console.error("Erreur enregistrement dossier:", dossierResult.error);
      return {
        success: false,
        error: "Erreur lors de l'enregistrement du dossier",
      };
    }

    debug.log("Dossier enregistré:", dossierResult.data.dossierId);

    // 8. Mettre à jour le statut du parcours à TODO
    debug.log("Mise à jour du statut du parcours...");
    await parcoursRepo.updateStatus(parcoursData.parcours.id, Status.TODO);
    debug.log("Statut mis à jour: TODO");

    debug.log("=== DOSSIER ÉLIGIBILITÉ CRÉÉ AVEC SUCCÈS ===");

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
      error: error instanceof Error ? error.message : "Erreur lors de la création du dossier d'éligibilité",
    };
  }
}

/**
 * Vérifie si l'utilisateur peut créer un dossier d'éligibilité
 */
export async function canCreateEligibiliteDossier(userId: string): Promise<boolean> {
  const parcours = await getParcoursComplet(userId);

  // Ne peut pas créer si déjà à l'étape éligibilité ou plus loin
  if (parcours?.parcours?.currentStep === Step.ELIGIBILITE) {
    return false;
  }

  return true;
}
