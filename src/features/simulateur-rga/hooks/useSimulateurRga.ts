import { useParcours } from "@/features/parcours/core/context/useParcours";

/**
 * Hook SimulateurRGA (facade de ParcoursContext)
 */
export function useSimulateurRga() {
  const { validateRGAData, rgaData, saveTempRgaData, clearTempRgaData } =
    useParcours();

  return {
    data: rgaData,
    isLoading: false, // Géré par ParcoursProvider
    hasData: rgaData !== null && Object.keys(rgaData).length > 0,
    saveRGA: saveTempRgaData,
    updateRGA: saveTempRgaData,
    clearRGA: clearTempRgaData,
    validateRGAData: validateRGAData,
  };
}
