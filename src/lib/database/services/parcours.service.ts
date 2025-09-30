import { Step, Status, DSStatus } from "@/lib/parcours/parcours.types";
import { getNextStep } from "@/lib/parcours/parcours.helpers";
import { userRepo, parcoursRepo, dossierDsRepo } from "../repositories";
import { prefillClient } from "@/lib/api/demarches-simplifiees/rest";

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

  // Déterminer la prochaine étape
  const prochainEtape =
    parcours.currentStatus === Status.VALIDE
      ? getNextStep(parcours.currentStep as Step)
      : null;

  return {
    parcours,
    dossiers,
    progression,
    isComplete: parcours.completedAt !== null,
    prochainEtape,
  };
}

/**
 * Fait progresser le parcours vers l'étape suivante si possible
 * Crée automatiquement un dossier vide pour la nouvelle étape
 */
export async function progressParcours(userId: string) {
  const parcours = await parcoursRepo.findByUserId(userId);
  if (!parcours) {
    throw new Error("Parcours non trouvé");
  }

  // Vérifier que l'étape courante est validée
  if (parcours.currentStatus !== Status.VALIDE) {
    return {
      success: false,
      message: "L'étape courante doit être validée pour progresser",
    };
  }

  // Obtenir l'étape suivante
  const nextStep = getNextStep(parcours.currentStep as Step);

  if (!nextStep) {
    // Dernière étape atteinte, marquer le parcours comme complété
    await parcoursRepo.markAsCompleted(parcours.id);
    return {
      success: true,
      message: "Parcours terminé !",
      completed: true,
    };
  }

  // Récupérer l'ID de démarche pour la nouvelle étape
  // TODO : a mettre dans un helper
  const dsDemarcheId = prefillClient.getDemarcheId(nextStep);

  // Créer un dossier vide pour la nouvelle étape
  await dossierDsRepo.create({
    parcoursId: parcours.id,
    step: nextStep,
    dsNumber: null,
    dsId: null,
    dsDemarcheId,
    dsStatus: DSStatus.EN_CONSTRUCTION,
    dsUrl: null,
    submittedAt: null,
    processedAt: null,
  });

  // Passer à l'étape suivante
  await parcoursRepo.updateStep(parcours.id, nextStep, Status.TODO);

  return {
    success: true,
    message: `Passage à l'étape ${nextStep}`,
    nextStep,
  };
}

/**
 * Met à jour le statut du parcours
 */
export async function updateParcoursStatus(parcoursId: string, status: Status) {
  return await parcoursRepo.updateStatus(parcoursId, status);
}

/**
 * Récupère le parcours par son ID
 */
export async function getParcoursById(parcoursId: string) {
  return await parcoursRepo.findById(parcoursId);
}

/**
 * Récupère le parcours d'un utilisateur
 */
export async function getParcoursByUserId(userId: string) {
  return await parcoursRepo.findByUserId(userId);
}
