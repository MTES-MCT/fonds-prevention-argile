import { useParcours } from "@/features/parcours/core/context/useParcours";

/**
 * Hook SimulateurRGA (facade de ParcoursContext)
 */
export function useSimulateurRga() {
  const { validateRGAData, rgaData, saveTempRgaData, clearTempRgaData, isLoading } = useParcours();

  // Pendant le chargement données incomplètes
  if (isLoading) {
    return {
      data: undefined,
      isLoading: true,
      hasData: undefined,
      saveRGA: saveTempRgaData,
      updateRGA: saveTempRgaData,
      clearRGA: clearTempRgaData,
      validateRGAData: validateRGAData,
    };
  }

  // Fonction helper pour vérifier si les données sont réellement présentes
  const hasValidData = () => {
    if (!rgaData) return false;
    if (Object.keys(rgaData).length === 0) return false;
    if (!rgaData.logement) return false;
    return true;
  };

  return {
    data: rgaData,
    isLoading: false,
    hasData: hasValidData(),
    saveRGA: saveTempRgaData,
    updateRGA: saveTempRgaData,
    clearRGA: clearTempRgaData,
    validateRGAData: validateRGAData,
  };
}
