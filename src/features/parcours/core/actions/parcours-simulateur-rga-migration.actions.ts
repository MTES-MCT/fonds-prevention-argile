"use server";

import { getSession } from "@/features/auth/server";
import type { ActionResult } from "@/shared/types";
import type { RGASimulationData, PartialRGASimulationData } from "@/shared/domain/types";
import { parcoursRepo } from "@/shared/database/repositories";

/**
 * Migre les données du simulateur RGA depuis localStorage vers la base de données
 * Appelée automatiquement après connexion FranceConnect
 */
export async function migrateSimulationDataToDatabase(rgaData: PartialRGASimulationData): Promise<ActionResult<void>> {
  try {
    // 1. Vérifier session utilisateur
    const session = await getSession();
    if (!session?.userId) {
      return {
        success: false,
        error: "Non connecté",
      };
    }

    // 2. Récupérer le parcours de l'utilisateur
    const parcours = await parcoursRepo.findByUserId(session.userId);

    if (!parcours) {
      return {
        success: false,
        error: "Parcours non trouvé",
      };
    }

    // 3. Vérifier que les données ne sont pas déjà migrées
    if (parcours.rgaSimulationData) {
      console.warn("Données RGA déjà présentes en BDD, migration ignorée");
      return {
        success: true,
        data: undefined,
      };
    }

    // 4. Ajouter le timestamp de simulation
    const rgaSimulationData: RGASimulationData = {
      ...rgaData,
      simulatedAt: new Date().toISOString(),
    } as RGASimulationData;

    // 5. Sauvegarder en base de données
    await parcoursRepo.updateRGAData(parcours.id, rgaSimulationData);

    return {
      success: true,
      data: undefined,
    };
  } catch (error) {
    console.error("[Migration RGA] Erreur:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur lors de la migration des données RGA",
    };
  }
}
