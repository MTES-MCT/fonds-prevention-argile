import { DSStatus } from "../domain/value-objects/ds-status";

/**
 * Type guards et parsers pour DSStatus
 */

/**
 * Vérifie si une valeur est un statut DS valide
 */
export function isValidDSStatus(value: unknown): value is DSStatus {
  return (
    typeof value === "string" &&
    Object.values(DSStatus).includes(value as DSStatus)
  );
}

/**
 * Parse une string en DSStatus avec validation
 * @throws {Error} Si la valeur n'est pas valide
 */
export function parseDSStatus(value: string): DSStatus {
  if (!isValidDSStatus(value)) {
    throw new Error(`Invalid DS status: ${value}`);
  }
  return value;
}
