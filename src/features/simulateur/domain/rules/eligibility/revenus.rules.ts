import { EligibilityReason } from "../../value-objects/eligibility-reason.enum";
import { calculerTrancheRevenu, isRegionIDF } from "../../types/rga-revenus.types";
import { RuleResult } from "../rule-result.types";

interface RevenusData {
  nombrePersonnes: number;
  revenuFiscalReference: number;
  codeRegion: string;
}

/**
 * Vérifie que les revenus sont éligibles (pas "supérieure")
 */
export function checkRevenus(data: RevenusData | undefined): RuleResult {
  if (!data) {
    return { passed: false, reason: EligibilityReason.REVENUS_TROP_ELEVES };
  }

  const estIDF = isRegionIDF(data.codeRegion);
  const tranche = calculerTrancheRevenu(data.revenuFiscalReference, data.nombrePersonnes, estIDF);

  const passed = tranche !== "supérieure";

  return {
    passed,
    reason: passed ? undefined : EligibilityReason.REVENUS_TROP_ELEVES,
  };
}

/**
 * Retourne la tranche de revenus calculée
 */
export function getTrancheRevenus(data: RevenusData): string {
  const estIDF = isRegionIDF(data.codeRegion);
  return calculerTrancheRevenu(data.revenuFiscalReference, data.nombrePersonnes, estIDF);
}
