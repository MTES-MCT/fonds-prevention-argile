import { validateRGAData } from "@/features/simulateur-rga";
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

    // Simulateur RGA
    tempRgaData: context.tempRgaData,
    rgaData: context.rgaData,

    // Actions RGA
    saveTempRgaData: context.saveTempRgaData,
    clearTempRgaData: context.clearTempRgaData,

    // Validation RGA
    validateRGAData,
    isValidRGA: context.rgaData
      ? validateRGAData(context.rgaData).length === 0
      : false,
    rgaErrors: context.rgaData ? validateRGAData(context.rgaData) : [],

    // Actions simplifiées
    refresh: context.refresh,
    syncNow: context.syncNow,

    // Helpers courants
    getDossierUrl: (step: Step) => {
      const dossier = context.getDossierByStep(step);
      return dossier?.demarcheUrl || null;
    },
    getCurrentDossierUrl: () => {
      const dossier = context.getCurrentDossier();
      return dossier?.demarcheUrl || null;
    },
  };
}
