import { Step, Status, DSStatus } from "@/lib/parcours/parcours.types";
import { mapDSStatusToInternalStatus } from "@/lib/parcours/parcours.helpers";
import { parcoursRepo, dossierDsRepo } from "../repositories";
import { progressParcours, updateParcoursStatus } from "./parcours.service";

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
      dsStatus: DSStatus.EN_CONSTRUCTION,
    });
  }

  // Créer le nouveau dossier
  const dossier = await dossierDsRepo.create({
    parcoursId: parcours.id,
    step,
    dsNumber: dsData.dsNumber,
    dsDemarcheId: dsData.dsDemarcheId,
    dsUrl: dsData.dsUrl,
    dsStatus: DSStatus.EN_CONSTRUCTION,
    submittedAt: new Date(),
  });

  // Si c'est l'étape courante, mettre à jour le statut du parcours
  if (parcours.currentStep === step && parcours.currentStatus === Status.TODO) {
    await updateParcoursStatus(parcours.id, Status.EN_INSTRUCTION);
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
    processedAt: dsStatus === DSStatus.ACCEPTE ? new Date() : undefined,
  });

  // Récupérer le parcours associé
  const parcours = await parcoursRepo.findById(dossier.parcoursId);
  if (!parcours) return dossier;

  // Si c'est l'étape courante du parcours, synchroniser le statut
  if (parcours.currentStep === dossier.step) {
    const internalStatus = mapDSStatusToInternalStatus(dsStatus);
    await updateParcoursStatus(parcours.id, internalStatus);

    // Si l'étape est validée, progresser automatiquement
    if (internalStatus === Status.VALIDE) {
      await progressParcours(parcours.userId);
    }
  }

  return dossier;
}

/**
 * Récupère tous les dossiers d'un parcours
 */
export async function getDossiersByParcoursId(parcoursId: string) {
  return await dossierDsRepo.findByParcoursId(parcoursId);
}

/**
 * Récupère un dossier par son numéro DS
 */
export async function getDossierByDsNumber(dsNumber: string) {
  return await dossierDsRepo.findByDsNumber(dsNumber);
}

/**
 * Récupère un dossier pour une étape spécifique d'un parcours
 */
export async function getDossierByParcoursAndStep(
  parcoursId: string,
  step: Step
) {
  return await dossierDsRepo.findByParcoursAndStep(parcoursId, step);
}

/**
 * Met à jour l'URL d'un dossier DS
 */
export async function updateDossierUrl(dossierId: string, dsUrl: string) {
  return await dossierDsRepo.update(dossierId, { dsUrl });
}

/**
 * Vérifie si un dossier DS existe déjà avec ce numéro
 */
export async function isDossierNumberExists(
  dsNumber: string
): Promise<boolean> {
  const dossier = await dossierDsRepo.findByDsNumber(dsNumber);
  return !!dossier;
}
