import { EligibilityReason } from "../../value-objects/eligibility-reason.enum";
import { DEPARTEMENTS_ELIGIBLES_RGA } from "@/shared/constants/rga.constants";
import { RuleResult } from "../rule-result.types";

/**
 * Vérifie si le département est éligible (11 départements pilotes)
 */
export function checkDepartementEligible(codeDepartement: string | undefined): RuleResult {
  if (!codeDepartement) {
    return { passed: false, reason: EligibilityReason.DEPARTEMENT_NON_ELIGIBLE };
  }

  const passed = DEPARTEMENTS_ELIGIBLES_RGA.includes(codeDepartement as never);
  return {
    passed,
    reason: passed ? undefined : EligibilityReason.DEPARTEMENT_NON_ELIGIBLE,
  };
}

/**
 * Vérifie si la zone d'exposition est forte
 */
export function checkZoneForte(zoneExposition: string | undefined): RuleResult {
  if (!zoneExposition) {
    return { passed: false, reason: EligibilityReason.ZONE_NON_FORTE };
  }

  const passed = zoneExposition === "fort";
  return {
    passed,
    reason: passed ? undefined : EligibilityReason.ZONE_NON_FORTE,
  };
}
