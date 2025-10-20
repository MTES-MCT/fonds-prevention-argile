import type { PartialRGAFormData } from "../domain/entities/rgaFormData";

/**
 * Valide les données RGA essentielles
 * Retourne un tableau d'erreurs (vide si valide)
 */
export function validateRGAData(data: PartialRGAFormData): string[] {
  const errors: string[] = [];

  if (!data.logement?.adresse) {
    errors.push("Adresse du logement manquante");
  }

  if (!data.menage?.revenu_rga || data.menage.revenu_rga <= 0) {
    errors.push("Revenu du ménage invalide");
  }

  if (!data.menage?.personnes || data.menage.personnes <= 0) {
    errors.push("Nombre de personnes invalide");
  }

  if (!data.logement?.type) {
    errors.push("Type de logement manquant");
  }

  return errors;
}
