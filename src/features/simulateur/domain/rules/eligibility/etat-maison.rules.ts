import { EligibilityReason } from "../../value-objects/eligibility-reason.enum";
import type { EtatSinistre } from "../../value-objects/simulation-constants";
import { RuleResult } from "../rule-result.types";

/**
 * Vérifie l'état de la maison (saine ou très peu endommagée)
 */
export function checkEtatMaison(etat: EtatSinistre | undefined): RuleResult {
  if (!etat) {
    return { passed: false, reason: EligibilityReason.MAISON_ENDOMMAGEE };
  }

  const passed = etat === "saine" || etat === "très peu endommagée";
  return {
    passed,
    reason: passed ? undefined : EligibilityReason.MAISON_ENDOMMAGEE,
  };
}
