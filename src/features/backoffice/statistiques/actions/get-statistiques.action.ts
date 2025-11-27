"use server";

import { getStatistiques } from "../services/statistiques.service";
import type { ActionResult } from "@/shared/types";
import type { Statistiques } from "../domain/statistiques.types";

/**
 * Action pour récupérer les statistiques globales de l'application
 */
export async function getStatistiquesAction(): Promise<
  ActionResult<Statistiques>
> {
  try {
    const stats = await getStatistiques();

    return {
      success: true,
      data: stats,
    };
  } catch (error) {
    console.error("Erreur lors de la récupération des statistiques:", error);

    return {
      success: false,
      error:
        "Une erreur est survenue lors de la récupération des statistiques.",
    };
  }
}
