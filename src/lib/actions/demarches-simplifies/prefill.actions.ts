"use server";

import { prefillClient } from "@/lib/api/demarches-simplifiees/rest";
import type {
  PrefillData,
  CreateDossierResponse,
  DemarcheSchema,
  DemarcheStats,
} from "@/lib/api/demarches-simplifiees/rest/types";
import type { ActionResult } from "./types";

// Import des données de mock
import mockDataRGA from "@/lib/mocks/prefill-data-reponses-ds.json";

// Type pour nos datasets de mock
type MockDataSet = "test" | "production" | "minimal";

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
 * Nettoie les données de mock en enlevant les commentaires
 */
function cleanMockData(data: Record<string, unknown>): PrefillData {
  const cleaned: PrefillData = {};

  for (const [key, value] of Object.entries(data)) {
    // Ignore les clés qui sont des commentaires (commencent par //)
    if (!key.startsWith("//") && value !== "") {
      cleaned[key] = value as string | number | boolean | null;
    }
  }

  return cleaned;
}

/**
 * Récupère les données de mock selon le dataset spécifié
 */
function getMockData(dataset: MockDataSet = "test"): PrefillData {
  const mockSet = mockDataRGA[dataset];

  if (!mockSet) {
    console.warn(
      `Dataset "${dataset}" non trouvé, utilisation du dataset "test"`
    );
    return cleanMockData(mockDataRGA.test.data);
  }

  return cleanMockData(mockSet.data);
}

/**
 * Crée un dossier prérempli avec des données de test
 * @param dataset - Le jeu de données à utiliser ("test", "production", "minimal")
 */
export async function createTestDossier(
  dataset: MockDataSet = "test"
): Promise<ActionResult<CreateDossierResponse>> {
  try {
    // Récupération des données de mock
    const testData = getMockData(dataset);

    console.log(`📋 Utilisation du dataset "${dataset}"`);
    console.log(
      `📊 Nombre de champs à préremplir: ${Object.keys(testData).length}`
    );

    // Validation basique des données
    const errors = prefillClient.validatePrefillData(testData);
    if (errors.length > 0) {
      console.warn("⚠️ Avertissements de validation:", errors);
      // On continue quand même, car certains champs peuvent être optionnels
    }

    // Création du dossier
    const result = await prefillClient.createPrefillDossier(testData);

    console.log("✅ Dossier test créé avec succès:", {
      dataset: dataset,
      numero: result.dossier_number,
      id: result.dossier_id,
      url: result.dossier_url,
    });

    return {
      success: true,
      data: result,
    };
  } catch (error) {
    console.error("❌ Erreur lors de la création du dossier test:", error);
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
 */
export async function generatePrefillUrl(
  dataset: MockDataSet = "minimal"
): Promise<ActionResult<string>> {
  try {
    // On utilise le dataset minimal par défaut pour éviter une URL trop longue
    const prefillData = getMockData(dataset);

    const url = prefillClient.generatePrefillUrl(prefillData);

    if (url.length > 2000) {
      console.warn(
        `⚠️ URL très longue (${url.length} caractères) - risque de ne pas fonctionner`
      );
    }

    console.log(
      `🔗 URL générée pour le dataset "${dataset}": ${url.length} caractères`
    );

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

/**
 * Liste les datasets disponibles avec leurs descriptions
 */
export async function listAvailableDatasets(): Promise<
  ActionResult<{ name: string; description: string }[]>
> {
  try {
    const datasets = Object.entries(mockDataRGA).map(([name, data]) => ({
      name,
      description: data.description,
    }));

    return {
      success: true,
      data: datasets,
    };
  } catch (error) {
    return {
      success: false,
      error:
        "Erreur lors de la récupération des datasets disponibles" +
        (error instanceof Error ? error.message : "Erreur inconnue"),
    };
  }
}
