"use server";

import { getSession } from "@/features/auth/server";
import type { ActionResult } from "@/shared/types";
import { mapRGAFormDataToDBSchema } from "@/features/simulateur-rga/mappers";
import type { RGAFormData } from "@/features/simulateur-rga/domain/entities";
import { parcoursPreventionRepository } from "@/shared/database/repositories/parcours-prevention.repository";

/**
 * Migre les données du simulateur RGA depuis localStorage vers la base de données
 * Appelée automatiquement après connexion FranceConnect
 */
export async function migrateSimulationDataToDatabase(
  rgaData: RGAFormData
): Promise<ActionResult<void>> {
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
    const parcours = await parcoursPreventionRepository.findByUserId(
      session.userId
    );

    if (!parcours) {
      return {
        success: false,
        error: "Parcours non trouvé",
      };
    }

    // 3. Vérifier que les données ne sont pas déjà migrées
    if (parcours.rgaSimulationData) {
      console.log("Données RGA déjà présentes en BDD, migration ignorée");
      return {
        success: true,
        data: undefined,
      };
    }

    // 4. Mapper les données RGA
    const rgaSimulationData = mapRGAFormDataToDBSchema(rgaData);

    // 5. Sauvegarder en base de données
    await parcoursPreventionRepository.updateRGAData(
      parcours.id,
      rgaSimulationData
    );

    console.log(`[Migration RGA] Données migrées pour parcours ${parcours.id}`);

    return {
      success: true,
      data: undefined,
    };
  } catch (error) {
    console.error("[Migration RGA] Erreur:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Erreur lors de la migration des données RGA",
    };
  }
}
