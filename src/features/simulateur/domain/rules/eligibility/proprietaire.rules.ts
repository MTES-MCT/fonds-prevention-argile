import { EligibilityReason } from "../../value-objects/eligibility-reason.enum";
import { RuleResult } from "../rule-result.types";

/**
 * Vérifie que l'utilisateur est propriétaire occupant
 */
export function checkProprietaireOccupant(proprietaireOccupant: boolean | undefined): RuleResult {
  if (proprietaireOccupant === undefined) {
    return { passed: false, reason: EligibilityReason.NON_PROPRIETAIRE_OCCUPANT };
  }

  return {
    passed: proprietaireOccupant,
    reason: proprietaireOccupant ? undefined : EligibilityReason.NON_PROPRIETAIRE_OCCUPANT,
  };
}
