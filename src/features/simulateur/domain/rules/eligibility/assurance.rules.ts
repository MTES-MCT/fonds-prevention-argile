import { EligibilityReason } from "../../value-objects/eligibility-reason.enum";
import { RuleResult } from "../rule-result.types";

/**
 * Vérifie que la maison est couverte par une assurance
 */
export function checkAssurance(assure: boolean | undefined): RuleResult {
  if (assure === undefined) {
    return { passed: false, reason: EligibilityReason.NON_ASSURE };
  }

  return {
    passed: assure,
    reason: assure ? undefined : EligibilityReason.NON_ASSURE,
  };
}
