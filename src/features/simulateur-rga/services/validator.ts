import { RGAFormData } from "./types";

/**
 * Valide les données RGA essentielles
 * TODO : Étendre les règles de validation selon les besoins
 */
export function validateRGAData(data: Partial<RGAFormData>): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!data.logement?.adresse) {
    errors.push("Adresse du logement manquante");
  }

  if (!data.menage?.revenu_rga) {
    errors.push("Revenu du ménage manquant");
  }

  if (!data.menage?.personnes) {
    errors.push("Nombre de personnes du ménage manquant");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
