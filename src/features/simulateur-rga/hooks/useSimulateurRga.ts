"use client";

import { useRGAStore, selectTempRgaData, selectIsHydrated } from "../stores";
import { validateRGAData } from "../services/validator.service";

/**
 * Hook pour interagir avec le simulateur RGA
 * Utilise le store Zustand
 */
export function useSimulateurRga() {
  // Sélecteurs granulaires pour éviter les re-renders inutiles
  const tempRgaData = useRGAStore(selectTempRgaData);
  const isHydrated = useRGAStore(selectIsHydrated);

  // Actions
  const saveRGA = useRGAStore((state) => state.saveRGA);
  const clearRGA = useRGAStore((state) => state.clearRGA);

  // Helper pour vérifier si les données sont valides
  const hasValidData = (): boolean => {
    if (!tempRgaData) return false;
    if (Object.keys(tempRgaData).length === 0) return false;
    if (!tempRgaData.logement) return false;
    return true;
  };

  // Pendant l'hydratation (SSR → Client)
  if (!isHydrated) {
    return {
      data: undefined,
      isLoading: true,
      hasData: undefined,
      saveRGA,
      updateRGA: saveRGA,
      clearRGA,
      validateRGAData,
    };
  }

  return {
    data: tempRgaData,
    isLoading: false,
    hasData: hasValidData(),
    saveRGA,
    updateRGA: saveRGA,
    clearRGA,
    validateRGAData,
  };
}
