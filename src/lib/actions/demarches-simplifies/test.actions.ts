"use server";

import { prefillClient } from "@/lib/api/demarches-simplifiees/rest";
import type {
  DemarcheSchema,
  CreateDossierResponse,
  PrefillData,
} from "@/lib/api/demarches-simplifiees/rest/types";
import type { ActionResult } from "../types";

// Import des données de mock pour les tests
import mockDataRGA from "@/lib/mocks/prefill-data-reponses-ds.json";
import { Step } from "@/lib/parcours/parcours.types";

type MockDataSet = "test" | "production" | "minimal";

/**
 * Récupère le schéma de la démarche pour affichage dans la page de test
 */
export async function getDemarcheSchema(): Promise<
  ActionResult<DemarcheSchema>
> {
  try {
    const schema = await prefillClient.getSchema(Step.ELIGIBILITE);
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
 * Crée un dossier de TEST avec des données mockées
 * Utilisé uniquement sur la page de test pour vérifier l'intégration
 *
 * @param dataset - Le jeu de données à utiliser ("test", "production", "minimal")
 */
export async function createTestDossier(
  dataset: MockDataSet = "test"
): Promise<ActionResult<CreateDossierResponse>> {
  try {
    // Récupération des données de mock
    const testData = getMockData(dataset);

    console.log(`[TEST] Utilisation du dataset "${dataset}"`);
    console.log(
      `[TEST] Nombre de champs à préremplir: ${Object.keys(testData).length}`
    );

    // Validation basique des données
    const errors = prefillClient.validatePrefillData(testData);
    if (errors.length > 0) {
      console.warn("[TEST] Avertissements de validation:", errors);
      // On continue quand même pour les tests
    }

    // Création du dossier de test
    const result = await prefillClient.createPrefillDossier(
      testData,
      Step.ELIGIBILITE
    );

    console.log("[TEST] Dossier test créé avec succès:", {
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
    console.error("[TEST] Erreur lors de la création du dossier test:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur inconnue",
    };
  }
}

/**
 * Génère une URL de préremplissage pour les tests (méthode GET)
 * Attention: limitée à ~2000 caractères
 *
 * Utilisé uniquement pour tester la génération d'URL
 */
export async function generateTestPrefillUrl(
  dataset: MockDataSet = "minimal"
): Promise<ActionResult<string>> {
  try {
    // On utilise le dataset minimal par défaut pour éviter une URL trop longue
    const prefillData = getMockData(dataset);

    const url = prefillClient.generatePrefillUrl(prefillData, Step.ELIGIBILITE);

    if (url.length > 2000) {
      console.warn(
        `[TEST] URL très longue (${url.length} caractères) - risque de ne pas fonctionner`
      );
    }

    console.log(
      `[TEST] URL générée pour le dataset "${dataset}": ${url.length} caractères`
    );

    return {
      success: true,
      data: url,
    };
  } catch (error) {
    console.error("[TEST] Erreur lors de la génération de l'URL:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur inconnue",
    };
  }
}

/**
 * Teste la validation des données avant préremplissage
 * Utilisé pour débugger les problèmes de validation
 */
export async function testValidatePrefillData(
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
      console.warn("[TEST] Erreurs de validation trouvées:", errors);
      return {
        success: false,
        error: errors.join(", "),
      };
    }

    console.log("[TEST] Données valides");
    return {
      success: true,
      data: [],
    };
  } catch (error) {
    console.error("[TEST] Erreur lors de la validation:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur inconnue",
    };
  }
}
