import { EligibilityReason } from "../../value-objects/eligibility-reason.enum";
import type { EtatSinistre } from "../../value-objects/simulation-constants";
import { RuleResult } from "../rule-result.types";

/**
 * Vérifie que la maison n'est pas "très endommagée" (désordres structuraux empêchant
 * l'usage normal de l'habitation). Les trois autres degrés (saine, très peu endommagée,
 * endommagée) restent éligibles.
 */
export function checkEtatMaison(sinistres: EtatSinistre | undefined): RuleResult {
  if (sinistres === undefined) {
    return { passed: false, reason: EligibilityReason.MAISON_TROP_ENDOMMAGEE };
  }

  const passed = sinistres !== "très endommagée";
  return {
    passed,
    reason: passed ? undefined : EligibilityReason.MAISON_TROP_ENDOMMAGEE,
  };
}
