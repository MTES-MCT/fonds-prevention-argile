import { EligibilityService } from "@/features/simulateur/domain/services/eligibility.service";
import type { EligibilityResult } from "@/features/simulateur/domain/entities/eligibility-result.entity";
import type { PartialRGASimulationData, RGASimulationData } from "@/shared/domain/types/rga-simulation.types";

/**
 * Verdict d'éligibilité d'une simulation saisie par un agent.
 * Partagé entre la création de dossier (`createDossierByAgent`) et la correction
 * de simulation (`updateSimulationDataAction`) pour ne pas diverger.
 */
export interface EligibiliteVerdict {
  result: EligibilityResult | null;
  /** La simulation est complète ET tous les critères passent. */
  isEligible: boolean;
  /** Un critère est éliminatoire (early exit). */
  isNonEligible: boolean;
}

/**
 * Évalue une simulation agent (avec early exit). `result` est `null` si la
 * simulation est absente ou incomplète sans critère bloquant.
 */
export function evaluateAgentSimulation(
  rgaData: RGASimulationData | PartialRGASimulationData | null | undefined
): EligibiliteVerdict {
  const result = rgaData ? EligibilityService.evaluate(rgaData).result : null;
  return {
    result,
    isEligible: result?.eligible === true,
    isNonEligible: result?.eligible === false,
  };
}

/**
 * Note d'archivage lisible incluant le libellé exact de la raison d'inéligibilité,
 * pour que l'agent voie pourquoi le dossier a été archivé.
 */
export function buildEligibiliteArchiveNote(result: EligibilityResult | null, origine: "creation" | "edition"): string {
  const reasonLabel = result?.reason ? EligibilityService.getReasonMessage(result.reason) : "";
  const base =
    origine === "creation"
      ? "Non éligible (simulation auto à la création)"
      : "Non éligible (simulation corrigée par un agent)";
  return reasonLabel ? `${base} — ${reasonLabel}` : base;
}
