import { parcoursRepo } from "@/shared/database/repositories";
import { dossierDsRepo } from "@/shared/database";
import type { Parcours, ParcoursState } from "../domain/entities/parcours";
import type { ParcoursComplet } from "../domain/types/parcours-query.types";
import { getNextStep } from "../domain/value-objects/step";
import {
  getParcoursPermissions,
  isParcoursComplete,
} from "./parcours-permissions.service";
import type { DossierDS } from "../../dossiers-ds/domain/entities/dossier-ds";
import type { DSStatus } from "../../dossiers-ds/domain/value-objects/ds-status";
import { getDossierDsDemandeUrl } from "../../dossiers-ds/utils/ds-url.utils";

/**
 * Service de gestion de l'état du parcours
 */

/**
 * Crée ou récupère le parcours d'un utilisateur
 */
export async function getOrCreateParcours(userId: string): Promise<Parcours> {
  const parcours = await parcoursRepo.findOrCreateForUser(userId);

  return {
    id: parcours.id,
    userId: parcours.userId,
    currentStep: parcours.currentStep,
    status: parcours.currentStatus,
    createdAt: parcours.createdAt,
    updatedAt: parcours.updatedAt,
    rgaSimulationData: parcours.rgaSimulationData,
    rgaSimulationCompletedAt: parcours.rgaSimulationCompletedAt,
    rgaDataDeletedAt: parcours.rgaDataDeletedAt,
    rgaDataDeletionReason: parcours.rgaDataDeletionReason,
  };
}

/**
 * Récupère le parcours complet avec dossiers et progression
 */
export async function getParcoursComplet(
  userId: string
): Promise<ParcoursComplet | null> {
  const parcours = await parcoursRepo.findByUserId(userId);

  if (!parcours) {
    return null;
  }

  const dossiersDb = await dossierDsRepo.findByParcoursId(parcours.id);

  // Mapper les dossiers DB vers le type entité métier DossierDS
  const dossiers: DossierDS[] = dossiersDb.map((d) => ({
    id: d.id,
    parcoursId: d.parcoursId,
    demarcheId: d.dsDemarcheId,
    demarcheNom: "", // Pas dans la DB, pourrait être récupéré depuis une config
    demarcheEtape: d.step,
    demarcheUrl: d.dsNumber ? getDossierDsDemandeUrl(parseInt(d.dsNumber)) : (d.dsUrl || undefined),
    numeroDs: d.dsNumber ? parseInt(d.dsNumber) : null,
    etatDs: d.dsStatus as DSStatus,
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
  }));

  // Déterminer si le parcours est complet
  const isComplete = parcours.completedAt !== null;

  // Calculer la prochaine étape
  const currentState: ParcoursState = {
    step: parcours.currentStep,
    status: parcours.currentStatus,
  };

  const prochainEtape = isParcoursComplete(currentState)
    ? null
    : getNextStep(parcours.currentStep);

  return {
    parcours: {
      id: parcours.id,
      userId: parcours.userId,
      currentStep: parcours.currentStep,
      status: parcours.currentStatus,
      createdAt: parcours.createdAt,
      updatedAt: parcours.updatedAt,
      rgaSimulationData: parcours.rgaSimulationData,
      rgaSimulationCompletedAt: parcours.rgaSimulationCompletedAt,
      rgaDataDeletedAt: parcours.rgaDataDeletedAt,
      rgaDataDeletionReason: parcours.rgaDataDeletionReason,
    },
    dossiers,
    isComplete,
    prochainEtape,
  };
}

/**
 * Initialise ou récupère le parcours d'un utilisateur
 */
export async function initOrGetParcours(userId: string): Promise<{
  parcoursId: string;
  state: ParcoursState;
}> {
  const parcours = await getOrCreateParcours(userId);

  return {
    parcoursId: parcours.id,
    state: {
      step: parcours.currentStep,
      status: parcours.status,
    },
  };
}

/**
 * Récupère l'état du parcours avec permissions
 */
export async function getParcoursStateWithPermissions(userId: string): Promise<{
  state: ParcoursState;
  nextAction: string;
  complete: boolean;
  canCreateDossier: boolean;
  canValidateDossier: boolean;
  canPassToNextStep: boolean;
}> {
  const data = await getParcoursComplet(userId);

  if (!data) {
    throw new Error("Parcours non trouvé");
  }

  const state: ParcoursState = {
    step: data.parcours.currentStep,
    status: data.parcours.status,
  };

  const permissions = getParcoursPermissions(state);

  return {
    state,
    nextAction: permissions.nextAction,
    complete: permissions.isComplete,
    canCreateDossier: permissions.canCreateDossier,
    canValidateDossier: permissions.canValidateDossier,
    canPassToNextStep: permissions.canPassToNextStep,
  };
}

/**
 * Récupère le parcours complet avec dossiers
 */
export async function getFullParcours(
  userId: string
): Promise<ParcoursComplet> {
  const data = await getParcoursComplet(userId);

  if (!data) {
    throw new Error("Parcours non trouvé");
  }

  return data;
}
