import { userRepo, parcoursRepo, dossierDsRepo } from "./repositories";
import {
  mapDSStatusToInternalStatus,
  type DSStatus,
  type Step,
} from "./types/parcours.types";
import { getNextStep } from "./utils/parcours.utils";

/**
 * Initialise ou récupère le parcours d'un utilisateur
 */
export async function getOrCreateParcours(userId: string) {
  // Vérifier que l'utilisateur existe
  const user = await userRepo.findById(userId);
  if (!user) {
    throw new Error("Utilisateur non trouvé");
  }

  return await parcoursRepo.findOrCreateForUser(userId);
}

/**
 * Récupère l'état complet du parcours avec ses dossiers DS
 */
export async function getParcoursComplet(userId: string) {
  const parcours = await parcoursRepo.findByUserId(userId);
  if (!parcours) return null;

  const dossiers = await dossierDsRepo.findByParcoursId(parcours.id);

  // Calculer la progression (0-100%)
  const stepsCompleted = dossiers.filter(
    (d) => d.dsStatus === "accepte"
  ).length;
  const progression = Math.round((stepsCompleted / 4) * 100);

  return {
    parcours,
    dossiers,
    progression,
    isComplete: parcours.completedAt !== null,
  };
}

/**
 * Crée ou met à jour un dossier DS après préremplissage
 * Appelé après que l'utilisateur ait créé un dossier sur DS
 */
export async function createDossierDS(
  userId: string,
  step: Step,
  dsData: {
    dsNumber: string;
    dsDemarcheId: string;
    dsUrl?: string;
  }
) {
  // Récupérer le parcours de l'utilisateur
  const parcours = await parcoursRepo.findByUserId(userId);
  if (!parcours) {
    throw new Error(
      "Parcours non trouvé - Veuillez initialiser votre parcours"
    );
  }

  // Vérifier qu'il n'y a pas déjà un dossier pour cette étape
  const existingDossier = await dossierDsRepo.findByParcoursAndStep(
    parcours.id,
    step
  );

  if (existingDossier) {
    // Si un dossier existe déjà, on le met à jour
    return await dossierDsRepo.update(existingDossier.id, {
      dsNumber: dsData.dsNumber,
      dsUrl: dsData.dsUrl,
      submittedAt: new Date(),
      dsStatus: "en_construction",
    });
  }

  // Créer le nouveau dossier
  const dossier = await dossierDsRepo.create({
    parcoursId: parcours.id,
    step,
    dsNumber: dsData.dsNumber,
    dsDemarcheId: dsData.dsDemarcheId,
    dsUrl: dsData.dsUrl,
    dsStatus: "en_construction",
    submittedAt: new Date(),
  });

  // Si c'est l'étape courante, mettre à jour le statut du parcours
  if (parcours.currentStep === step && parcours.currentStatus === "TODO") {
    await parcoursRepo.updateStatus(parcours.id, "EN_INSTRUCTION");
  }

  return dossier;
}

/**
 * Synchronise le statut d'un dossier DS
 * Appelé par webhook DS ou job de synchronisation
 */
export async function syncDossierDS(
  dsNumber: string,
  dsStatus: DSStatus,
  dsData?: {
    dsId?: string;
    dsUrl?: string;
  }
) {
  // Trouver le dossier par son numéro DS
  const dossier = await dossierDsRepo.findByDsNumber(dsNumber);
  if (!dossier) {
    console.warn(`Dossier DS ${dsNumber} non trouvé en base`);
    return null;
  }

  // Mettre à jour le dossier
  await dossierDsRepo.updateFromDS(dossier.id, {
    dsStatus,
    dsId: dsData?.dsId,
    dsUrl: dsData?.dsUrl,
    processedAt: dsStatus === "accepte" ? new Date() : undefined,
  });

  // Récupérer le parcours associé
  const parcours = await parcoursRepo.findById(dossier.parcoursId);
  if (!parcours) return dossier;

  // Si c'est l'étape courante du parcours, synchroniser le statut
  if (parcours.currentStep === dossier.step) {
    const internalStatus = mapDSStatusToInternalStatus(dsStatus);
    await parcoursRepo.updateStatus(parcours.id, internalStatus);

    // Si l'étape est validée, progresser automatiquement
    if (internalStatus === "VALIDE") {
      await progressParcours(parcours.userId);
    }
  }

  return dossier;
}

/**
 * Fait progresser le parcours vers l'étape suivante si possible
 */
export async function progressParcours(userId: string) {
  const parcours = await parcoursRepo.findByUserId(userId);
  if (!parcours) {
    throw new Error("Parcours non trouvé");
  }

  // Vérifier que l'étape courante est validée
  if (parcours.currentStatus !== "VALIDE") {
    return {
      success: false,
      message: "L'étape courante doit être validée pour progresser",
    };
  }

  // Obtenir l'étape suivante
  const nextStep = getNextStep(parcours.currentStep);

  if (!nextStep) {
    // Dernière étape atteinte, marquer le parcours comme complété
    await parcoursRepo.markAsCompleted(parcours.id);
    return {
      success: true,
      message: "Parcours terminé !",
      completed: true,
    };
  }

  // Passer à l'étape suivante
  await parcoursRepo.updateStep(parcours.id, nextStep, "TODO");

  return {
    success: true,
    message: `Passage à l'étape ${nextStep}`,
    nextStep,
  };
}
