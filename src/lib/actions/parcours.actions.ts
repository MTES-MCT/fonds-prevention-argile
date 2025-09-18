"use server";

import {
  getOrCreateParcours,
  getParcoursComplet,
  createDossierDS,
  progressParcours,
} from "@/lib/database/services";
import type { Step } from "@/lib/database/types/parcours.types";
import type { ParcoursPrevention } from "@/lib/database/schema/parcours-prevention";
import type { DossierDemarchesSimplifiees } from "@/lib/database/schema/dossiers-demarches-simplifiees";
import type { ActionResult } from "./demarches-simplifies/types";
import { getSession } from "../auth/services/auth.service";
import { parcoursRepo } from "../database/repositories";

/**
 * Initialise le parcours pour l'utilisateur connecté
 */
export async function initierParcours(): Promise<
  ActionResult<{
    parcoursId: string;
    currentStep: Step;
    message: string;
  }>
> {
  try {
    // Vérifier l'authentification
    const session = await getSession();
    if (!session?.userId) {
      return {
        success: false,
        error: "Vous devez être connecté pour démarrer un parcours",
      };
    }

    // Créer ou récupérer le parcours
    const parcours = await getOrCreateParcours(session.userId);

    return {
      success: true,
      data: {
        parcoursId: parcours.id,
        currentStep: parcours.currentStep,
        message:
          parcours.createdAt === parcours.updatedAt
            ? "Parcours créé avec succès"
            : "Parcours existant récupéré",
      },
    };
  } catch (error) {
    console.error("Erreur lors de l'initialisation du parcours:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur inconnue",
    };
  }
}

export async function reinitialiserParcours() {
  const session = await getSession();
  if (!session?.userId) {
    return { success: false, error: "Non connecté" };
  }

  const data = await getParcoursComplet(session.userId);
  if (!data) {
    return { success: false, error: "Pas de parcours" };
  }

  await parcoursRepo.resetParcours(data.parcours.id);
  return { success: true, data: { message: "Parcours réinitialisé" } };
}

/**
 * Récupère l'état complet du parcours de l'utilisateur
 */
export async function obtenirMonParcours(): Promise<
  ActionResult<{
    parcours: ParcoursPrevention;
    dossiers: DossierDemarchesSimplifiees[];
    progression: number;
    isComplete: boolean;
    prochainEtape: Step | null;
  }>
> {
  try {
    // Vérifier l'authentification
    const session = await getSession();
    if (!session?.userId) {
      return {
        success: false,
        error: "Vous devez être connecté pour accéder à votre parcours",
      };
    }

    // Récupérer le parcours complet
    const data = await getParcoursComplet(session.userId);

    if (!data) {
      return {
        success: false,
        error:
          "Aucun parcours trouvé. Veuillez d'abord initialiser votre parcours.",
      };
    }

    // Déterminer la prochaine étape
    const { getNextStep } = await import("@/lib/database/utils/parcours.utils");
    const prochainEtape =
      data.parcours.currentStatus === "VALIDE"
        ? getNextStep(data.parcours.currentStep)
        : data.parcours.currentStep;

    return {
      success: true,
      data: {
        ...data,
        prochainEtape,
      },
    };
  } catch (error) {
    console.error("Erreur lors de la récupération du parcours:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur inconnue",
    };
  }
}

/**
 * Enregistre un dossier DS après préremplissage
 * Appelé après que l'utilisateur ait créé son dossier sur Démarches Simplifiées
 */
export async function enregistrerDossierDS(
  step: Step,
  dsNumber: string,
  dsDemarcheId: string,
  dsUrl?: string
): Promise<
  ActionResult<{
    dossierId: string;
    message: string;
  }>
> {
  try {
    // Vérifier l'authentification
    const session = await getSession();
    if (!session?.userId) {
      return {
        success: false,
        error: "Vous devez être connecté pour enregistrer un dossier",
      };
    }

    // Validation basique
    if (!dsNumber || !dsDemarcheId) {
      return {
        success: false,
        error: "Le numéro de dossier et l'identifiant de démarche sont requis",
      };
    }

    // Créer le dossier
    const dossier = await createDossierDS(session.userId, step, {
      dsNumber,
      dsDemarcheId,
      dsUrl,
    });

    if (!dossier) {
      return {
        success: false,
        error: "Impossible de créer le dossier",
      };
    }

    return {
      success: true,
      data: {
        dossierId: dossier.id,
        message: `Dossier ${dsNumber} enregistré pour l'étape ${step}`,
      },
    };
  } catch (error) {
    console.error("Erreur lors de l'enregistrement du dossier:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur inconnue",
    };
  }
}

/**
 * Fait progresser le parcours vers l'étape suivante
 * Appelé quand une étape est validée
 */
export async function avancerParcours(): Promise<
  ActionResult<{
    success: boolean;
    message: string;
    nextStep?: Step;
    completed?: boolean;
  }>
> {
  try {
    // Vérifier l'authentification
    const session = await getSession();
    if (!session?.userId) {
      return {
        success: false,
        error: "Vous devez être connecté pour progresser dans le parcours",
      };
    }

    // Progresser
    const result = await progressParcours(session.userId);

    if (!result.success) {
      return {
        success: false,
        error: result.message,
      };
    }

    return {
      success: true,
      data: {
        success: result.success,
        message: result.message,
        nextStep: result.nextStep,
        completed: result.completed,
      },
    };
  } catch (error) {
    console.error("Erreur lors de la progression du parcours:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur inconnue",
    };
  }
}

/**
 * Vérifie l'état d'une étape spécifique
 */
export async function verifierEtape(step: Step): Promise<
  ActionResult<{
    hasDocument: boolean;
    documentStatus: string | null;
    documentNumber: string | null;
    canProgress: boolean;
  }>
> {
  try {
    // Vérifier l'authentification
    const session = await getSession();
    if (!session?.userId) {
      return {
        success: false,
        error: "Vous devez être connecté",
      };
    }

    // Récupérer le parcours
    const data = await getParcoursComplet(session.userId);
    if (!data) {
      return {
        success: false,
        error: "Parcours non trouvé",
      };
    }

    // Chercher le dossier pour cette étape
    const dossier = data.dossiers.find((d) => d.step === step);

    return {
      success: true,
      data: {
        hasDocument: !!dossier,
        documentStatus: dossier?.dsStatus || null,
        documentNumber: dossier?.dsNumber || null,
        canProgress: dossier?.dsStatus === "accepte",
      },
    };
  } catch (error) {
    console.error("Erreur lors de la vérification de l'étape:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur inconnue",
    };
  }
}

/**
 * Récupère un résumé du parcours pour le tableau de bord
 */
export async function obtenirResumeParcours(): Promise<
  ActionResult<{
    exists: boolean;
    currentStep: Step | null;
    currentStatus: string | null;
    progression: number;
    nextAction: string;
    documentsCount: number;
    documentsAccepted: number;
  }>
> {
  try {
    // Vérifier l'authentification
    const session = await getSession();
    if (!session?.userId) {
      return {
        success: false,
        error: "Vous devez être connecté",
      };
    }

    // Récupérer le parcours
    const data = await getParcoursComplet(session.userId);

    // Si pas de parcours
    if (!data) {
      return {
        success: true,
        data: {
          exists: false,
          currentStep: null,
          currentStatus: null,
          progression: 0,
          nextAction: "Démarrer votre parcours",
          documentsCount: 0,
          documentsAccepted: 0,
        },
      };
    }

    // Calculer les statistiques
    const documentsAccepted = data.dossiers.filter(
      (d) => d.dsStatus === "accepte"
    ).length;

    // Déterminer la prochaine action
    let nextAction = "Continuer votre parcours";
    if (data.isComplete) {
      nextAction = "Parcours terminé !";
    } else if (data.parcours.currentStatus === "TODO") {
      nextAction = `Compléter l'étape ${data.parcours.currentStep}`;
    } else if (data.parcours.currentStatus === "EN_INSTRUCTION") {
      nextAction = "En attente de validation";
    } else if (data.parcours.currentStatus === "VALIDE") {
      nextAction = "Passer à l'étape suivante";
    }

    return {
      success: true,
      data: {
        exists: true,
        currentStep: data.parcours.currentStep,
        currentStatus: data.parcours.currentStatus,
        progression: data.progression,
        nextAction,
        documentsCount: data.dossiers.length,
        documentsAccepted,
      },
    };
  } catch (error) {
    console.error("Erreur lors de la récupération du résumé:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur inconnue",
    };
  }
}
