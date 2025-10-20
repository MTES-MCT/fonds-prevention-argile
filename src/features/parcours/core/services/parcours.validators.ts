import { Step, Status, DSStatus } from "./parcours.types";

/**
 * Vérifie si une valeur est une étape valide
 */
export function isValidStep(value: unknown): value is Step {
  return (
    typeof value === "string" && Object.values(Step).includes(value as Step)
  );
}

/**
 * Vérifie si une valeur est un statut valide
 */
export function isValidStatus(value: unknown): value is Status {
  return (
    typeof value === "string" && Object.values(Status).includes(value as Status)
  );
}

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
 * Parse une string en Step avec validation
 * @throws {Error} Si la valeur n'est pas valide
 */
export function parseStep(value: string): Step {
  if (!isValidStep(value)) {
    throw new Error(`Invalid step: ${value}`);
  }
  return value;
}

/**
 * Parse une string en Status avec validation
 * @throws {Error} Si la valeur n'est pas valide
 */
export function parseStatus(value: string): Status {
  if (!isValidStatus(value)) {
    throw new Error(`Invalid status: ${value}`);
  }
  return value;
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
