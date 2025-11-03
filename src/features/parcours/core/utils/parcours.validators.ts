import { Step } from "../domain/value-objects/step";
import { Status } from "../domain/value-objects/status";

/**
 * Type guards et parsers pour les types du parcours
 */

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
