import type { EligibilityChecks } from "../entities/eligibility-result.entity";

/**
 * Le simulateur de vulnérabilité porte sur les gestes à faire autour d'une maison dont on est
 * propriétaire occupant : il n'a pas de sens pour un appartement ni pour un locataire.
 */
export function peutProposerVulnerabilite(checks: EligibilityChecks): boolean {
  return checks.maison !== false && checks.proprietaireOccupant !== false;
}
