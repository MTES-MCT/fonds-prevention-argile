"use server";

import { getSession, ROLES } from "@/features/auth/server";
import type { ActionResult } from "@/shared/types";
import type { DemarcheDetailed, DossiersConnection, Dossier, DossiersFilters } from "../adapters/graphql/types";
import { graphqlClient } from "../adapters";
import { getServerEnv } from "@/shared/config/env.config";
import { Step } from "../../core";
import { isAdminRole } from "@/shared/domain/value-objects/user-role.enum";

/**
 * Actions admin pour gérer les démarches DS
 */

/**
 * Map un Step vers son ID de démarche DS correspondant
 */
function getStepDemarcheId(step: Step): number {
  const env = getServerEnv();

  const stepToDemarcheMap: Record<Step, string> = {
    [Step.CHOIX_AMO]: env.DEMARCHES_SIMPLIFIEES_ID_ELIGIBILITE,
    [Step.ELIGIBILITE]: env.DEMARCHES_SIMPLIFIEES_ID_ELIGIBILITE,
    [Step.DIAGNOSTIC]: env.DEMARCHES_SIMPLIFIEES_ID_DIAGNOSTIC,
    [Step.DEVIS]: env.DEMARCHES_SIMPLIFIEES_ID_DEVIS,
    [Step.FACTURES]: env.DEMARCHES_SIMPLIFIEES_ID_FACTURES,
  };

  return parseInt(stepToDemarcheMap[step], 10);
}

/**
 * Récupère les détails d'une démarche
 * @param stepOrDemarcheNumber - Step enum ou numéro de démarche direct
 */
export async function getDemarcheDetails(stepOrDemarcheNumber: Step | number): Promise<ActionResult<DemarcheDetailed>> {
  try {
    const session = await getSession();

    if (!session?.userId || !isAdminRole(session.role)) {
      return {
        success: false,
        error: "Accès non autorisé",
      };
    }

    const demarcheNumber =
      typeof stepOrDemarcheNumber === "number" ? stepOrDemarcheNumber : getStepDemarcheId(stepOrDemarcheNumber);

    const demarche = await graphqlClient.getDemarcheDetailed(demarcheNumber);

    if (!demarche) {
      return {
        success: false,
        error: `Démarche ${demarcheNumber} non trouvée`,
      };
    }

    return {
      success: true,
      data: demarche,
    };
  } catch (error) {
    console.error("Erreur getDemarcheDetails:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur inconnue",
    };
  }
}

/**
 * Récupère le schéma d'une démarche
 * @param stepOrDemarcheNumber - Step enum ou numéro de démarche direct
 */
export async function getDemarcheSchema(stepOrDemarcheNumber: Step | number): Promise<ActionResult<DemarcheDetailed>> {
  try {
    const session = await getSession();

    if (!session?.userId || !isAdminRole(session.role)) {
      return {
        success: false,
        error: "Accès non autorisé",
      };
    }

    const demarcheNumber =
      typeof stepOrDemarcheNumber === "number" ? stepOrDemarcheNumber : getStepDemarcheId(stepOrDemarcheNumber);

    const demarche = await graphqlClient.getDemarcheSchema(demarcheNumber);

    if (!demarche) {
      return {
        success: false,
        error: `Démarche ${demarcheNumber} non trouvée`,
      };
    }

    return {
      success: true,
      data: demarche,
    };
  } catch (error) {
    console.error("Erreur getDemarcheSchema:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur inconnue",
    };
  }
}

/**
 * Récupère les dossiers d'une démarche avec filtres
 * @param stepOrDemarcheNumber - Step enum ou numéro de démarche direct
 */
export async function getDossiers(
  stepOrDemarcheNumber: Step | number,
  filters?: DossiersFilters
): Promise<ActionResult<DossiersConnection>> {
  try {
    const session = await getSession();

    if (!session?.userId || !isAdminRole(session.role)) {
      return {
        success: false,
        error: "Accès non autorisé",
      };
    }

    const demarcheNumber =
      typeof stepOrDemarcheNumber === "number" ? stepOrDemarcheNumber : getStepDemarcheId(stepOrDemarcheNumber);

    const dossiers = await graphqlClient.getDemarcheDossiers(demarcheNumber, filters);

    if (!dossiers) {
      return {
        success: false,
        error: "Impossible de récupérer les dossiers",
      };
    }

    return {
      success: true,
      data: dossiers,
    };
  } catch (error) {
    console.error("Erreur getDossiers:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur inconnue",
    };
  }
}

/**
 * Récupère un dossier par son numéro
 */
export async function getDossierByNumber(dossierNumber: number): Promise<ActionResult<Dossier>> {
  try {
    const session = await getSession();

    if (!session?.userId || !isAdminRole(session.role)) {
      return {
        success: false,
        error: "Accès non autorisé",
      };
    }

    const dossier = await graphqlClient.getDossier(dossierNumber);

    if (!dossier) {
      return {
        success: false,
        error: `Dossier ${dossierNumber} non trouvé`,
      };
    }

    return {
      success: true,
      data: dossier,
    };
  } catch (error) {
    console.error("Erreur getDossierByNumber:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur inconnue",
    };
  }
}
