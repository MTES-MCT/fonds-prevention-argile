import { EligibilityReason } from "../../value-objects/eligibility-reason.enum";
import { RuleResult } from "../rule-result.types";

/**
 * Vérifie que le demandeur n'a pas de demande d'aide catastrophe naturelle en cours.
 * L'aide du fonds prévention argile n'est pas cumulable avec une aide catnat.
 */
export function checkCatastrophesNaturelles(demandeCatnatEnCours: boolean | undefined): RuleResult {
  if (demandeCatnatEnCours === undefined) {
    return { passed: false, reason: EligibilityReason.DEMANDE_CATNAT_EN_COURS };
  }

  const passed = !demandeCatnatEnCours;
  return {
    passed,
    reason: passed ? undefined : EligibilityReason.DEMANDE_CATNAT_EN_COURS,
  };
}
