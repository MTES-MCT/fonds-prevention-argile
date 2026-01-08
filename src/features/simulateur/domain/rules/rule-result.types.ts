import type { EligibilityReason } from "../value-objects/eligibility-reason.enum";

export interface RuleResult {
  passed: boolean;
  reason?: EligibilityReason;
}
