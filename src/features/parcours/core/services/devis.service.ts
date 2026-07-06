import type { ActionResult } from "@/shared/types";
import { Step } from "../domain/value-objects/step";
import { Status } from "../domain/value-objects/status";
import { getParcoursComplet } from "./parcours-state.service";
import { prefillClient } from "../../dossiers-ds/adapters";
import { createDossierForCurrentStep, getDossierByStep } from "../../dossiers-ds/services";
import { parcoursRepo } from "@/shared/database";
import { createDebugLogger } from "@/shared/utils";
import { DS_FIELD_IDS } from "../../dossiers-ds/domain/value-objects/ds-field-ids";
import { toAdresseRueSeule, toCommuneValue } from "../../dossiers-ds/domain/value-objects/ds-field-transformers";
import { getServerEnv } from "@/shared/config/env.config";

const debug = createDebugLogger("DEVIS");

interface DevisResult {
  dossierUrl: string;
  dossierNumber: number;
  dossierId: string;
  message: string;
}

/**
 * Crée (ou récupère) le dossier DS devis (phase travaux) pour l'utilisateur.
 * Préremplit les 3 annotations privées (dossier éligibilité étude, dossier
 * paiement étude, lien back office FPA) + commune (routage instructeurs) et
 * adresse depuis la simulation RGA. Idempotent : si un dossier existe déjà pour
 * l'étape, retourne son URL.
 */
export async function createDevisDossier(userId: string): Promise<ActionResult<DevisResult>> {
  try {
    debug.log("=== DÉBUT CRÉATION DOSSIER DEVIS ===");
    debug.log("User ID:", userId);

    const parcoursData = await getParcoursComplet(userId);
    if (!parcoursData) {
      return { success: false, error: "Parcours non trouvé" };
    }

    if (parcoursData.parcours.currentStep !== Step.DEVIS) {
      console.error("Étape incorrecte:", parcoursData.parcours.currentStep, "!== DEVIS");
      return {
        success: false,
        error: "Vous n'êtes pas à l'étape devis",
      };
    }

    // Idempotence : si un dossier existe déjà pour cette étape, le retourner.
    const existing = await getDossierByStep(parcoursData.parcours.id, Step.DEVIS);
    if (existing) {
      debug.log("Dossier devis déjà existant, renvoi de l'URL:", existing.dsUrl);
      return {
        success: true,
        data: {
          dossierUrl: existing.dsUrl ?? "",
          dossierNumber: Number(existing.dsNumber),
          dossierId: existing.id,
          message: "Dossier devis déjà créé",
        },
      };
    }

    if (parcoursData.parcours.status !== Status.TODO && parcoursData.parcours.status !== Status.EN_INSTRUCTION) {
      console.error("Statut incorrect:", parcoursData.parcours.status);
      return {
        success: false,
        error: "Un dossier existe déjà pour cette étape",
      };
    }

    // Construction du prefill des annotations privées
    const eligibiliteDossier = await getDossierByStep(parcoursData.parcours.id, Step.ELIGIBILITE);
    const diagnosticDossier = await getDossierByStep(parcoursData.parcours.id, Step.DIAGNOSTIC);
    const env = getServerEnv();
    const fpaLink = `${env.BASE_URL}/espace-agent/dossiers/${parcoursData.parcours.id}`;

    const prefillData: Record<string, string | number | boolean | (string | number)[]> = {};

    if (eligibiliteDossier?.dsNumber) {
      prefillData[`champ_${DS_FIELD_IDS.DEVIS.ANNOTATION_DOSSIER_ELIGIBILITE}`] = eligibiliteDossier.dsNumber;
    } else {
      console.warn("Devis: aucun dossier d'éligibilité trouvé pour préremplir l'annotation");
    }

    if (diagnosticDossier?.dsNumber) {
      prefillData[`champ_${DS_FIELD_IDS.DEVIS.ANNOTATION_DOSSIER_PAIEMENT_ETUDE}`] = diagnosticDossier.dsNumber;
    } else {
      console.warn("Devis: aucun dossier de diagnostic (paiement étude) trouvé pour préremplir l'annotation");
    }

    prefillData[`champ_${DS_FIELD_IDS.DEVIS.ANNOTATION_LIEN_FPA}`] = fpaLink;

    // Commune (routage vers le bon groupe d'instructeurs) + adresse (texte),
    // depuis la simulation RGA. Best-effort : on ne bloque pas si données absentes.
    const logement = parcoursData.parcours.rgaSimulationData?.logement;
    if (logement?.commune) {
      prefillData[`champ_${DS_FIELD_IDS.DEVIS.COMMUNE}`] = toCommuneValue(logement.commune, logement.adresse);
    } else {
      console.warn("Devis: code commune RGA absent, champ commune (routage) non prérempli");
    }
    if (logement?.adresse) {
      prefillData[`champ_${DS_FIELD_IDS.DEVIS.ADRESSE_MAISON_TEXTE}`] = toAdresseRueSeule(logement.adresse);
    } else {
      console.warn("Devis: adresse RGA absente, champ adresse non prérempli");
    }

    debug.log("Payload prérempli envoyé à DS:", JSON.stringify(prefillData, null, 2));

    const createResponse = await prefillClient.createPrefillDossier(prefillData, Step.DEVIS);

    debug.log("=== RÉPONSE DS ===");
    debug.log("  dossier_url:", createResponse.dossier_url);
    debug.log("  dossier_number:", createResponse.dossier_number);
    debug.log("  dossier_id:", createResponse.dossier_id);
    debug.log("A vérifier côté DS : annotations privées + commune et adresse préremplies.");

    if (!createResponse.dossier_url || !createResponse.dossier_number) {
      console.error("Réponse DS invalide:", createResponse);
      return {
        success: false,
        error: "Réponse invalide de Démarches Simplifiées",
      };
    }

    const demarcheId = prefillClient.getDemarcheId(Step.DEVIS);

    const dossierResult = await createDossierForCurrentStep(userId, parcoursData.parcours.id, Step.DEVIS, {
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

    // Le dossier vient d'être créé dans DS mais n'est pas encore déposé (ds_status NULL).
    // current_status reste TODO : il ne passera à EN_INSTRUCTION que lorsque la sync DS
    // constatera la prise en instruction par la DDT. Voir ADR-0009.
    await parcoursRepo.updateStatus(parcoursData.parcours.id, Status.TODO);
    debug.log("=== DOSSIER DEVIS CRÉÉ AVEC SUCCÈS ===");

    return {
      success: true,
      data: {
        dossierUrl: createResponse.dossier_url,
        dossierNumber: createResponse.dossier_number,
        dossierId: dossierResult.data.dossierId,
        message: "Dossier devis créé avec succès",
      },
    };
  } catch (error) {
    console.error("Erreur createDevisDossier:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur lors de la création du dossier devis",
    };
  }
}
