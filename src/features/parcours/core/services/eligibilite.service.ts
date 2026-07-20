import type { ActionResult } from "@/shared/types";
import { Step } from "../domain/value-objects/step";
import { getParcoursComplet } from "./parcours-state.service";
import { mapRGAToDSFormat, validateRGADataForDS } from "../../dossiers-ds/mappers/rga-to-ds.mapper";
import { Status } from "../domain";
import { getAmoChoisie } from "../../amo/actions";
import { prefillClient } from "../../dossiers-ds/adapters";
import { createDossierForCurrentStep, getDossierByStep } from "../../dossiers-ds/services";
import { parcoursRepo, userRepo } from "@/shared/database";
import { DS_FIELDS_ELIGIBILITE } from "../../dossiers-ds/domain";
import { DS_FIELD_IDS } from "../../dossiers-ds/domain/value-objects/ds-field-ids";
import { createDebugLogger } from "@/shared/utils";
import { PartialRGASimulationData } from "@/features/simulateur";
import { getServerEnv } from "@/shared/config/env.config";

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
 * Crée un dossier d'éligibilité avec les données RGA.
 * Préremplit aussi l'annotation privée « Lien vers le dossier sur le fonds de
 * prévention argile » (comme diagnostic/devis).
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

    // Idempotence : si un dossier existe déjà pour cette étape, le retourner
    // (le current_status ne sert plus de verrou anti-doublon, cf. ADR-0009).
    const existing = await getDossierByStep(parcoursData.parcours.id, Step.ELIGIBILITE);
    if (existing) {
      debug.log("Dossier éligibilité déjà existant, renvoi de l'URL:", existing.dsUrl);
      return {
        success: true,
        data: {
          dossierUrl: existing.dsUrl ?? "",
          dossierNumber: Number(existing.dsNumber),
          dossierId: existing.id,
          message: "Dossier éligibilité déjà créé",
        },
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

    // 3. Récupérer l'AMO choisie (optionnelle : peut être null en mode FACULTATIF
    //    quand le demandeur a choisi « je gère seul », statut validation = SANS_AMO).
    //    En mode OBLIGATOIRE / AV_AMO_FUSIONNES, l'AMO est auto-attribuée à la création
    //    du parcours donc getAmoChoisie retourne toujours une AMO.
    debug.log("Récupération de l'AMO choisie...");
    const amoResult = await getAmoChoisie();
    if (!amoResult.success) {
      console.error("Erreur récupération AMO:", amoResult.error);
      return {
        success: false,
        error: amoResult.error || "Erreur lors de la récupération de l'AMO",
      };
    }

    const amo = amoResult.data;
    if (amo) {
      debug.log("AMO choisie:", {
        nom: amo.nom,
        siret: amo.siret,
        email: amo.emails.split(";")[0].trim(),
      });
    } else {
      debug.log("Aucune AMO (mode FACULTATIF avec choix 'je gère seul') — création sans champs AMO.");
    }

    // 4. Mapper RGA → DS avec ajout des infos AMO si présentes
    debug.log("Mapping RGA → DS...");
    const prefillData = mapRGAToDSFormat(rgaData);

    // Ajouter les informations de l'AMO au prefill uniquement si une AMO est sélectionnée
    if (amo) {
      prefillData[`champ_${DS_FIELD_IDS.ELIGIBILITE.SIRET_AMO}`] = amo.siret;
      prefillData[`champ_${DS_FIELD_IDS.ELIGIBILITE.EMAIL_AMO}`] = amo.emails.split(";")[0].trim();
      if (amo.adresse) {
        prefillData[`champ_${DS_FIELD_IDS.ELIGIBILITE.ADRESSE_AMO}`] = amo.adresse;
      }
      if (amo.telephone) {
        prefillData[`champ_${DS_FIELD_IDS.ELIGIBILITE.TELEPHONE_AMO}`] = amo.telephone;
      }
    }

    // Ajouter le téléphone du demandeur
    const user = await userRepo.findById(userId);
    if (user?.telephone) {
      prefillData[`champ_Q2hhbXAtNTQyMjQ0MA==`] = user.telephone;
    }

    // Annotation privée : lien vers le dossier back-office FPA (comme diagnostic/devis)
    const env = getServerEnv();
    const fpaLink = `${env.BASE_URL}/espace-agent/dossiers/${parcoursData.parcours.id}`;
    prefillData[`champ_${DS_FIELD_IDS.ELIGIBILITE.ANNOTATION_LIEN_FPA}`] = fpaLink;

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
