import { EligibilityReason } from "../../value-objects/eligibility-reason.enum";
import { RuleResult } from "../rule-result.types";

/**
 * Vérifie que la maison n'est pas mitoyenne
 */
export function checkNonMitoyen(mitoyen: boolean | undefined): RuleResult {
  if (mitoyen === undefined) {
    return { passed: false, reason: EligibilityReason.MAISON_MITOYENNE };
  }

  const passed = mitoyen === false;
  return {
    passed,
    reason: passed ? undefined : EligibilityReason.MAISON_MITOYENNE,
  };
}
