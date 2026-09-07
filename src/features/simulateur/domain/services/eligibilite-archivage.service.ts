import { EligibilityService } from "./eligibility.service";
import type { EligibilityResult } from "../entities/eligibility-result.entity";
import type { PartialRGASimulationData, RGASimulationData } from "@/shared/domain/types/rga-simulation.types";

/**
 * Verdict d'éligibilité d'une simulation. Partagé entre la création de dossier
 * (`createDossierByAgent`), la correction de simulation (`updateSimulationDataAction`)
 * et la simulation du demandeur (`enregistrerSimulationDemandeur`) pour ne pas diverger.
 */
export interface EligibiliteVerdict {
  result: EligibilityResult | null;
  /** La simulation est complète ET tous les critères passent. */
  isEligible: boolean;
  /** Un critère est éliminatoire (early exit). */
  isNonEligible: boolean;
}

/**
 * Évalue une simulation (avec early exit). `result` est `null` si la simulation
 * est absente ou incomplète sans critère bloquant.
 */
export function evaluateSimulation(
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
 * Préfixe commun à toutes les notes d'archivage émises par un recalcul d'éligibilité
 * (création, édition agent, qualification prospect). Sert de marqueur pour distinguer
 * un archivage « pour inéligibilité » d'un archivage manuel (abandon, non-réponse…).
 */
export const ELIGIBILITE_ARCHIVE_PREFIX = "Non éligible";

/** Origine du recalcul ayant déclenché l'archivage. */
export type OrigineArchivageEligibilite = "creation" | "edition" | "demandeur";

const NOTES_PAR_ORIGINE: Record<OrigineArchivageEligibilite, string> = {
  creation: `${ELIGIBILITE_ARCHIVE_PREFIX} (simulation auto à la création)`,
  edition: `${ELIGIBILITE_ARCHIVE_PREFIX} (simulation corrigée par un agent)`,
  demandeur: `${ELIGIBILITE_ARCHIVE_PREFIX} (simulation du demandeur)`,
};

/**
 * Note d'archivage lisible incluant le libellé exact de la raison d'inéligibilité,
 * pour que l'agent voie pourquoi le dossier a été archivé.
 */
export function buildEligibiliteArchiveNote(
  result: EligibilityResult | null,
  origine: OrigineArchivageEligibilite
): string {
  const reasonLabel = result?.reason ? EligibilityService.getReasonMessage(result.reason) : "";
  const base = NOTES_PAR_ORIGINE[origine];
  return reasonLabel ? `${base} — ${reasonLabel}` : base;
}

/**
 * Vrai si la note d'archivage provient d'un recalcul d'éligibilité (préfixe
 * « Non éligible ») — donc dé-archivable automatiquement quand la simulation
 * redevient éligible. Un archivage manuel (abandon, non-réponse, reste à charge…)
 * ne matche pas et n'est jamais annulé automatiquement.
 */
export function isEligibiliteArchiveReason(reason: string | null | undefined): boolean {
  return typeof reason === "string" && reason.startsWith(ELIGIBILITE_ARCHIVE_PREFIX);
}
