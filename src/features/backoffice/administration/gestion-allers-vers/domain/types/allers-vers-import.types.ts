/**
 * Type pour l'import des Allers Vers depuis Excel
 */
export interface AllersVersImportRow {
  nom: string;
  emails: string;
  telephone: string;
  adresse: string;
  departements: string;
  epci: string;
}

/**
 * Résultat de l'import
 */
export interface AllersVersImportResult {
  success: boolean;
  created: number;
  errors: string[];
}
