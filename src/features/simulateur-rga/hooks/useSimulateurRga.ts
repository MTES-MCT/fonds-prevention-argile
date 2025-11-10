import { useParcours } from "@/features/parcours/core/context/useParcours";

/**
 * Hook SimulateurRGA (facade de ParcoursContext)
 */
export function useSimulateurRga() {
  const {
    validateRGAData,
    rgaData,
    saveTempRgaData,
    clearTempRgaData,
    isLoading,
  } = useParcours();

  // Fonction helper pour vérifier si les données sont réellement présentes
  const hasValidData = () => {
    if (!rgaData) return false;

    // Vérifier si l'objet est vide
    if (Object.keys(rgaData).length === 0) return false;

    // Vérifier si au moins une section critique existe
    // (logement est obligatoire pour une simulation valide)
    if (!rgaData.logement) return false;

    return true;
  };

  return {
    data: rgaData,
    isLoading,
    hasData: hasValidData(),
    saveRGA: saveTempRgaData,
    updateRGA: saveTempRgaData,
    clearRGA: clearTempRgaData,
    validateRGAData: validateRGAData,
  };
}
