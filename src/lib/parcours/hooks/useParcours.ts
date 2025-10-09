"use client";

import { useParcoursContext } from "../context/ParcoursContext";
import { Step } from "../parcours.types";

/**
 * Hook simplifié pour utiliser le parcours
 * Wrapper autour du context pour une API plus simple
 */
export function useParcours() {
  const context = useParcoursContext();

  return {
    // État principal
    parcours: context.parcours,
    currentStep: context.currentStep,
    currentStatus: context.currentStatus,
    hasParcours: context.hasParcours,

    // Etat AMO
    statutAmo: context.statutAmo,

    // État DS
    lastDSStatus: context.lastDSStatus,
    hasDossiers: context.dossiers && context.dossiers.length > 0,
    dossiers: context.dossiers,

    // Loading
    isLoading: context.isLoading,
    isSyncing: context.isSyncing,
    error: context.error,

    // Actions simplifiées
    refresh: context.refresh,
    syncNow: context.syncNow,

    // Helpers courants
    getDossierUrl: (step: Step) => {
      const dossier = context.getDossierByStep(step);
      return dossier?.dsUrl || null;
    },
    getCurrentDossierUrl: () => {
      const dossier = context.getCurrentDossier();
      return dossier?.dsUrl || null;
    },
  };
}
