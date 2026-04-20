import type { ActionResult } from "@/shared/types";
import { Step } from "../domain/value-objects/step";
import { Status } from "../domain/value-objects/status";
import { getParcoursComplet } from "./parcours-state.service";
import { prefillClient } from "../../dossiers-ds/adapters";
import { createDossierForCurrentStep, getDossierByStep } from "../../dossiers-ds/services";
import { parcoursRepo } from "@/shared/database";
import { createDebugLogger } from "@/shared/utils";
import { DS_FIELD_IDS } from "../../dossiers-ds/domain/value-objects/ds-field-ids";
import { getServerEnv } from "@/shared/config/env.config";

const debug = createDebugLogger("DIAGNOSTIC");

interface DiagnosticResult {
  dossierUrl: string;
  dossierNumber: number;
  dossierId: string;
  message: string;
}

/**
 * Crée (ou récupère) le dossier DS diagnostic pour l'utilisateur.
 * Préremplit les 2 annotations privées (lien dossier éligibilité, lien back office FPA).
 * Idempotent : si un dossier existe déjà pour l'étape, retourne son URL.
 */
export async function createDiagnosticDossier(userId: string): Promise<ActionResult<DiagnosticResult>> {
  try {
    debug.log("=== DÉBUT CRÉATION DOSSIER DIAGNOSTIC ===");
    debug.log("User ID:", userId);

    const parcoursData = await getParcoursComplet(userId);
    if (!parcoursData) {
      return { success: false, error: "Parcours non trouvé" };
    }

    if (parcoursData.parcours.currentStep !== Step.DIAGNOSTIC) {
      console.error("Étape incorrecte:", parcoursData.parcours.currentStep, "!== DIAGNOSTIC");
      return {
        success: false,
        error: "Vous n'êtes pas à l'étape diagnostic",
      };
    }

    // Idempotence : si un dossier existe déjà pour cette étape, le retourner.
    const existing = await getDossierByStep(parcoursData.parcours.id, Step.DIAGNOSTIC);
    if (existing) {
      debug.log("Dossier diagnostic déjà existant, renvoi de l'URL:", existing.dsUrl);
      return {
        success: true,
        data: {
          dossierUrl: existing.dsUrl ?? "",
          dossierNumber: Number(existing.dsNumber),
          dossierId: existing.id,
          message: "Dossier diagnostic déjà créé",
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
    const env = getServerEnv();
    const fpaLink = `${env.BASE_URL}/espace-agent/dossiers/${parcoursData.parcours.id}`;

    const prefillData: Record<string, string | number | boolean | (string | number)[]> = {};

    if (eligibiliteDossier?.dsNumber) {
      prefillData[`champ_${DS_FIELD_IDS.DIAGNOSTIC.ANNOTATION_DOSSIER_ELIGIBILITE}`] = eligibiliteDossier.dsNumber;
    } else {
      console.warn("Aucun dossier d'éligibilité trouvé pour préremplir l'annotation");
    }

    prefillData[`champ_${DS_FIELD_IDS.DIAGNOSTIC.ANNOTATION_LIEN_FPA}`] = fpaLink;

    debug.log("=== PREFILL ANNOTATIONS (essai via endpoint public /preremplir) ===");
    debug.log("  Annotation dossier éligibilité (DossierLink):");
    debug.log(`    ID: ${DS_FIELD_IDS.DIAGNOSTIC.ANNOTATION_DOSSIER_ELIGIBILITE}`);
    debug.log(`    Valeur: ${eligibiliteDossier?.dsNumber ?? "<absent>"}`);
    debug.log("  Annotation lien FPA (Text):");
    debug.log(`    ID: ${DS_FIELD_IDS.DIAGNOSTIC.ANNOTATION_LIEN_FPA}`);
    debug.log(`    Valeur: ${fpaLink}`);
    debug.log("Payload complet envoyé à DS:", JSON.stringify(prefillData, null, 2));

    const createResponse = await prefillClient.createPrefillDossier(prefillData, Step.DIAGNOSTIC);

    debug.log("=== RÉPONSE DS ===");
    debug.log("  dossier_url:", createResponse.dossier_url);
    debug.log("  dossier_number:", createResponse.dossier_number);
    debug.log("  dossier_id:", createResponse.dossier_id);
    debug.log(
      "A vérifier manuellement côté DS : ouvrir le dossier et confirmer que les 2 annotations privées sont bien remplies."
    );

    if (!createResponse.dossier_url || !createResponse.dossier_number) {
      console.error("Réponse DS invalide:", createResponse);
      return {
        success: false,
        error: "Réponse invalide de Démarches Simplifiées",
      };
    }

    const demarcheId = prefillClient.getDemarcheId(Step.DIAGNOSTIC);

    const dossierResult = await createDossierForCurrentStep(userId, parcoursData.parcours.id, Step.DIAGNOSTIC, {
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

    await parcoursRepo.updateStatus(parcoursData.parcours.id, Status.EN_INSTRUCTION);
    debug.log("=== DOSSIER DIAGNOSTIC CRÉÉ AVEC SUCCÈS ===");

    return {
      success: true,
      data: {
        dossierUrl: createResponse.dossier_url,
        dossierNumber: createResponse.dossier_number,
        dossierId: dossierResult.data.dossierId,
        message: "Dossier diagnostic créé avec succès",
      },
    };
  } catch (error) {
    console.error("Erreur createDiagnosticDossier:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur lors de la création du dossier diagnostic",
    };
  }
}
