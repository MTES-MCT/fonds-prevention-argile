/**
 * Structure d'une ligne du fichier Excel AMO
 */
export interface AmoExcelRow {
  nom: string;
  siret: string;
  departements: string;
  emails: string;
  telephone: string;
  adresse: string;
  codes_insee?: string;
}

/**
 * Résultat de l'import Excel
 */
export interface AmoImportResult {
  success: boolean;
  message: string;
  stats?: {
    entreprisesCreated: number;
    communesCreated: number;
  };
  errors?: string[];
}

/**
 * Options d'import
 */
export interface AmoImportOptions {
  clearExisting: boolean;
  validateSiret: boolean;
}
