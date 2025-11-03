import { PartialRGAFormData } from "../domain/entities";

/**
 * Interface du contexte RGA
 */
export interface RGAContextType {
  // État
  data: PartialRGAFormData | null;
  isLoading: boolean;
  hasData: boolean;

  // État dérivé
  isValid: boolean;
  errors: string[];

  // Actions
  saveRGA: (data: PartialRGAFormData) => boolean;
  updateRGA: (updates: PartialRGAFormData) => boolean;
  clearRGA: () => void;
  reloadFromStorage: () => void;

  // Validation
  validateRGAData: (data: PartialRGAFormData) => string[];
}
