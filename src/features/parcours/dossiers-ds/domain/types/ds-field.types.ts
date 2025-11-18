import { DSFieldType, DSSection } from "../value-objects";

/**
 * Interface pour un champ Démarches Simplifiées
 */
export interface DSField {
  id: string;
  label: string;
  section: DSSection;
  type: DSFieldType;
  rgaPath?: string; // Chemin dans l'objet RGAFormData
  transformer?: (
    value: unknown,
    rgaData?: Record<string, unknown>
  ) => string | number | boolean | unknown | (string | number)[];
}
