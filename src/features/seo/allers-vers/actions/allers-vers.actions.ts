"use server";

import {
  getAllAllersVersWithRelations,
  getAllersVersByDepartement,
  getAllersVersByEpci,
  getAllersVersByDepartementOrEpci,
} from "../services";
import type { ActionResult } from "@/shared/types";
import type { AllersVers } from "../domain/entities";

/**
 * Action pour récupérer tous les Allers Vers avec relations (admin)
 */
export async function getAllAllersVersWithRelationsAction(): Promise<
  ActionResult<
    Array<
      AllersVers & {
        departements: { codeDepartement: string }[];
        epci: { codeEpci: string }[];
      }
    >
  >
> {
  try {
    const allersVers = await getAllAllersVersWithRelations();

    return {
      success: true,
      data: allersVers,
    };
  } catch (error) {
    console.error("Erreur lors de la récupération des Allers Vers:", error);
    return {
      success: false,
      error: "Impossible de récupérer les Allers Vers",
    };
  }
}

/**
 * Action pour récupérer les Allers Vers par département
 */
export async function getAllersVersByDepartementAction(codeDepartement: string): Promise<ActionResult<AllersVers[]>> {
  try {
    const allersVers = await getAllersVersByDepartement(codeDepartement);

    return {
      success: true,
      data: allersVers,
    };
  } catch (error) {
    console.error("Erreur lors de la récupération des Allers Vers:", error);
    return {
      success: false,
      error: "Impossible de récupérer les Allers Vers",
    };
  }
}

/**
 * Action pour récupérer les Allers Vers par EPCI
 */
export async function getAllersVersByEpciAction(codeEpci: string): Promise<ActionResult<AllersVers[]>> {
  try {
    const allersVers = await getAllersVersByEpci(codeEpci);

    return {
      success: true,
      data: allersVers,
    };
  } catch (error) {
    console.error("Erreur lors de la récupération des Allers Vers:", error);
    return {
      success: false,
      error: "Impossible de récupérer les Allers Vers",
    };
  }
}

/**
 * Action pour récupérer les Allers Vers par département ou EPCI
 */
export async function getAllersVersByDepartementOrEpciAction(
  codeDepartement: string,
  codeEpci?: string
): Promise<ActionResult<AllersVers[]>> {
  try {
    const allersVers = await getAllersVersByDepartementOrEpci(codeDepartement, codeEpci);

    return {
      success: true,
      data: allersVers,
    };
  } catch (error) {
    console.error("Erreur lors de la récupération des Allers Vers:", error);
    return {
      success: false,
      error: "Impossible de récupérer les Allers Vers",
    };
  }
}
