"use server";

import { prefillClient } from "@/lib/api/demarches-simplifiees/rest";
import type {
  PrefillData,
  CreateDossierResponse,
} from "@/lib/api/demarches-simplifiees/rest/types";
import type { ActionResult } from "../types";
import { Step } from "@/lib/parcours/parcours.types";
import { DS_FIELDS } from "@/lib/constants/dsFields.constants";
import { RGAFormData } from "@/lib/form-rga";
import { getMappingStats } from "@/lib/services/rga-to-ds.mapper";
import { getServerEnv } from "@/lib/config/env.config";
import { getDemarchesSimplifieesClient } from "@/lib/api/demarches-simplifiees/graphql";
import { getSession } from "@/lib/auth/services/auth.service";
import { syncDossierEligibiliteStatus } from "@/lib/database/services/dossier-ds-sync.service";

/**
 * Crée un dossier prérempli dans Démarches Simplifiées
 *
 * Action principale utilisée par le parcours d'éligibilité
 * pour créer un vrai dossier avec les données du simulateur RGA
 *
 * @param data - Les données transformées depuis RGA vers le format DS
 */
export async function createPrefillDossier(
  data: PrefillData,
  step: Step,
  rgaDataOriginal?: Partial<RGAFormData> // Paramètre optionnel pour debug
): Promise<ActionResult<CreateDossierResponse>> {
  try {
    // Si on a les données RGA originales, logger la comparaison
    if (rgaDataOriginal) {
      const env = getServerEnv();
      const demarcheId = parseInt(env.DEMARCHES_SIMPLIFIEES_ID_ELIGIBILITE);
      const client = getDemarchesSimplifieesClient();
      const schema = await client.getDemarcheSchema(demarcheId);
      
      console.log("schema de la démarche :>> ", JSON.stringify(schema));
      const addressField = schema?.activeRevision?.champDescriptors.find((c) =>
        c.label.toLowerCase().includes("adresse")
      );
      console.log("Format attendu pour l'adresse:", addressField);

      console.log("📊 Analyse du mapping RGA → DS:");
      const stats = getMappingStats(rgaDataOriginal);
      console.log(`  - Champs mappables totaux: ${stats.total}`);
      console.log(
        `  - Champs effectivement mappés: ${stats.filled} (${stats.percentage}%)`
      );
      console.log(`  - Par section:`, stats.bySection);

      // Logger les données RGA qui auraient dû être mappées
      console.log("🔍 Données RGA source:");
      console.log(JSON.stringify(rgaDataOriginal, null, 2));
    }

    // Logging des champs mappés
    console.log("📤 Envoi vers DS - Étape:", step);
    console.log("📝 Nombre de champs préremplis:", Object.keys(data).length);

    // Afficher chaque champ avec sa valeur
    console.log("📋 Détail des champs mappés:");
    Object.entries(data).forEach(([key, value]) => {
      const fieldId = key.replace("champ_", "");
      const fieldInfo = DS_FIELDS[fieldId];
      const label = fieldInfo?.label || "Champ inconnu";
      console.log(`  - ${label} (${key}): ${JSON.stringify(value)}`);
    });

    // Validation des données
    const errors = prefillClient.validatePrefillData(data);

    if (errors.length > 0) {
      console.warn("Avertissements de validation DS:", errors);
      // On ne bloque pas si ce sont juste des avertissements
      // Les champs requis sont déjà validés côté RGA
    }

    // Création du dossier
    const result = await prefillClient.createPrefillDossier(data, step);

    console.log("✅ Dossier DS créé avec succès:", {
      numero: result.dossier_number,
      url: result.dossier_url,
      champsEnvoyes: Object.keys(data).length,
      detailChamps: Object.keys(data),
    });

    console.log("Dossier DS créé:", {
      numero: result.dossier_number,
      url: result.dossier_url,
    });

    // Synchroniser immédiatement le statut après création
    try {
      const session = await getSession();
      if (session?.userId) {
        console.log("Synchronisation du statut DS après création...");
        await syncDossierEligibiliteStatus(session.userId, step);
      }
    } catch (syncError) {
      // Ne pas bloquer si la sync échoue
      console.error("Erreur lors de la sync post-création:", syncError);
    }

    return {
      success: true,
      data: result,
    };
  } catch (error) {
    console.error("Erreur création dossier DS:", error);

    // Gestion d'erreurs spécifiques de l'API DS
    if (error instanceof Error) {
      if (
        error.message.includes("401") ||
        error.message.includes("Unauthorized")
      ) {
        return {
          success: false,
          error:
            "Erreur d'authentification avec Démarches Simplifiées. Veuillez contacter le support.",
        };
      }

      if (error.message.includes("404")) {
        return {
          success: false,
          error: "Démarche introuvable. Veuillez contacter le support.",
        };
      }

      if (
        error.message.includes("422") ||
        error.message.includes("validation")
      ) {
        return {
          success: false,
          error:
            "Les données envoyées ne sont pas valides. Veuillez vérifier votre simulation.",
        };
      }

      if (error.message.includes("500") || error.message.includes("503")) {
        return {
          success: false,
          error:
            "Démarches Simplifiées est temporairement indisponible. Veuillez réessayer dans quelques minutes.",
        };
      }
    }

    return {
      success: false,
      error:
        "Erreur lors de la création du dossier. Veuillez réessayer ou contacter le support.",
    };
  }
}

/**
 * Valide les données avant envoi (optionnel)
 *
 * Peut être utilisé pour vérifier les données avant l'envoi réel
 * Utile pour du debug ou des vérifications préalables
 *
 * @param data - Les données à valider
 */
export async function validatePrefillData(
  data: PrefillData
): Promise<ActionResult<{ valid: boolean; warnings: string[] }>> {
  try {
    const warnings = prefillClient.validatePrefillData(data);

    return {
      success: true,
      data: {
        valid: warnings.length === 0,
        warnings,
      },
    };
  } catch (error) {
    console.error("Erreur lors de la validation:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur de validation",
    };
  }
}
