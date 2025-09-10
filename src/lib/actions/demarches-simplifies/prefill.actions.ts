"use server";

import { prefillClient } from "@/lib/api/demarches-simplifiees/rest";
import type {
  PrefillData,
  CreateDossierResponse,
  DemarcheSchema,
  DemarcheStats,
} from "@/lib/api/demarches-simplifiees/rest/types";

import type { ActionResult } from "./types";

/**
 * Récupère le schéma de la démarche
 */
export async function getDemarcheSchema(): Promise<
  ActionResult<DemarcheSchema>
> {
  try {
    const schema = await prefillClient.getSchema();
    return {
      success: true,
      data: schema,
    };
  } catch (error) {
    console.error("Erreur lors de la récupération du schéma:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur inconnue",
    };
  }
}

/**
 * Récupère les statistiques de la démarche
 */
export async function getDemarcheStats(): Promise<ActionResult<DemarcheStats>> {
  try {
    const stats = await prefillClient.getStats();
    return {
      success: true,
      data: stats,
    };
  } catch (error) {
    console.error("Erreur lors de la récupération des stats:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur inconnue",
    };
  }
}

/**
 * Crée un dossier prérempli avec des données de test
 */
export async function createTestDossier(): Promise<
  ActionResult<CreateDossierResponse>
> {
  try {
    // Données de test en dur
    // Note: Vous devrez remplacer ces clés par les vraies clés de votre démarche
    // Récupérez-les via getDemarcheSchema() ou sur /preremplir/{nom-demarche}
    const testData: PrefillData = {
      // Exemples de champs - à adapter selon votre démarche
      // Format: "champ_Q2hhbXAtMTx0MjM2OX==": "valeur"

      // Informations personnelles
      "champ_Q2hhbXAtMTx0MjM2OQ==": "Dupont", // Nom
      "champ_Q2hhbXAtMTx0MjM3MA==": "Jean", // Prénom
      "champ_Q2hhbXAtMTx0MjM3MQ==": "jean.dupont@example.com", // Email
      "champ_Q2hhbXAtMTx0MjM3Mg==": "0601020304", // Téléphone

      // Adresse du logement
      "champ_Q2hhbXAtMTx0MjM3Mw==": "12 rue de la République", // Adresse
      "champ_Q2hhbXAtMTx0MjM3NA==": "75001", // Code postal
      "champ_Q2hhbXAtMTx0MjM3NQ==": "Paris", // Ville

      // Informations sur le sinistre RGA
      "champ_Q2hhbXAtMTx0MjM3Ng==": "2024-01-15", // Date de constat
      "champ_Q2hhbXAtMTx0MjM3Nw==":
        "Fissures importantes sur les murs porteurs, affaissement du plancher", // Description

      // Surface et année de construction
      "champ_Q2hhbXAtMTx0MjM3OA==": 120, // Surface en m²
      "champ_Q2hhbXAtMTx0MjM3OQ==": 1985, // Année de construction

      // Case à cocher pour acceptation
      "champ_Q2hhbXAtMTx0MjM4MA==": true, // J'accepte les conditions
    };

    const result = await prefillClient.createPrefillDossier(testData);

    console.log("✅ Dossier test créé avec succès:", {
      numero: result.dossier_number,
      id: result.dossier_id,
      url: result.dossier_url,
    });

    return {
      success: true,
      data: result,
    };
  } catch (error) {
    console.error("❌ Erreur lors de la création du dossier:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur inconnue",
    };
  }
}

/**
 * Crée un dossier prérempli avec des données personnalisées
 */
export async function createPrefillDossier(
  data: PrefillData
): Promise<ActionResult<CreateDossierResponse>> {
  try {
    // Validation basique des données
    const errors = prefillClient.validatePrefillData(data);
    if (errors.length > 0) {
      return {
        success: false,
        error: `Erreurs de validation: ${errors.join(", ")}`,
      };
    }

    const result = await prefillClient.createPrefillDossier(data);

    console.log("✅ Dossier créé avec succès:", result.dossier_number);

    return {
      success: true,
      data: result,
    };
  } catch (error) {
    console.error("❌ Erreur lors de la création du dossier:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur inconnue",
    };
  }
}

/**
 * Génère une URL de préremplissage (méthode GET)
 * Attention: limitée à ~2000 caractères
 * Utilité à vérifier selon les cas d'usage
 */
export async function generatePrefillUrl(
  data?: PrefillData
): Promise<ActionResult<string>> {
  try {
    // Données de test simplifiées si non fournies
    const prefillData = data || {
      "champ_Q2hhbXAtMTx0MjM2OQ==": "Test Nom",
      "champ_Q2hhbXAtMTx0MjM3MA==": "Test Prénom",
      "champ_Q2hhbXAtMTx0MjM3MQ==": "test@example.com",
    };

    const url = prefillClient.generatePrefillUrl(prefillData);

    if (url.length > 2000) {
      console.warn(`⚠️ URL très longue (${url.length} caractères)`);
    }

    return {
      success: true,
      data: url,
    };
  } catch (error) {
    console.error("❌ Erreur lors de la génération de l'URL:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur inconnue",
    };
  }
}

/**
 * Valide les données avant préremplissage
 * Utile pour vérifier la conformité avec le schéma
 */
export async function validatePrefillData(
  data: PrefillData
): Promise<ActionResult<string[]>> {
  try {
    // Récupère le schéma pour validation
    const schemaResult = await getDemarcheSchema();

    if (!schemaResult.success) {
      return {
        success: false,
        error: "Impossible de récupérer le schéma pour validation",
      };
    }

    const errors = prefillClient.validatePrefillData(data, schemaResult.data);

    if (errors.length > 0) {
      return {
        success: false,
        error: errors.join(", "),
      };
    }

    return {
      success: true,
      data: [],
    };
  } catch (error) {
    console.error("❌ Erreur lors de la validation:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur inconnue",
    };
  }
}
