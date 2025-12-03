import { Step } from "../domain";
import { useParcoursContext } from "./ParcoursContext";

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
    validationAmoComplete: context.validationAmoComplete,

    // État DS
    lastDSStatus: context.lastDSStatus,
    hasDossiers: context.dossiers && context.dossiers.length > 0,
    dossiers: context.dossiers,

    // Loading
    isLoading: context.isLoading,
    isSyncing: context.isSyncing,
    error: context.error,

    // Actions
    refresh: context.refresh,
    syncNow: context.syncNow,
    syncAll: context.syncAll,

    // Helpers courants
    getDossierUrl: (step: Step) => {
      const dossier = context.getDossierByStep(step);
      return dossier?.demarcheUrl || null;
    },
    getCurrentDossierUrl: () => {
      const dossier = context.getCurrentDossier();
      return dossier?.demarcheUrl || null;
    },
    getDossierByStep: context.getDossierByStep,
    getDSStatusByStep: context.getDSStatusByStep,
    getCurrentDossier: context.getCurrentDossier,
  };
}

// Hook optionnel qui ne plante pas si hors contexte
export function useOptionalParcours() {
  try {
    return useParcours();
  } catch {
    return null;
  }
}
