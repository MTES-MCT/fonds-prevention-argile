import type { PartialRGASimulationData, RGASimulationData } from "@/shared/domain/types";
import type { EligibilityResult, EligibilityChecks } from "../entities/eligibility-result.entity";
import { createEligibleResult, createNonEligibleResult } from "../entities/eligibility-result.entity";
import { EligibilityReason, ELIGIBILITY_REASON_MESSAGES } from "../value-objects/eligibility-reason.enum";
import { evaluateEligibility, evaluateAllChecks, isSimulationComplete } from "../rules/navigation";

/**
 * Service d'éligibilité - orchestre les vérifications
 */
export const EligibilityService = {
  /**
   * Évalue l'éligibilité avec les données actuelles
   */
  evaluate(answers: PartialRGASimulationData): {
    result: EligibilityResult | null;
    checks: EligibilityChecks;
    isComplete: boolean;
  } {
    const { checks, shouldExit, failedAtStep } = evaluateEligibility(answers);
    const isComplete = isSimulationComplete(answers);

    // Early exit : non éligible
    if (shouldExit && failedAtStep) {
      const reason = getReasonFromChecks(checks);
      if (reason) {
        return {
          result: createNonEligibleResult(failedAtStep, reason, checks),
          checks,
          isComplete: false,
        };
      }
    }

    // Simulation complète et toutes les règles passées : éligible
    if (isComplete && !shouldExit) {
      return {
        result: createEligibleResult("resultat", checks),
        checks,
        isComplete: true,
      };
    }

    // Simulation en cours
    return {
      result: null,
      checks,
      isComplete,
    };
  },

  /**
   * Évalue l'éligibilité en mode édition agent.
   * Utilise evaluateAllChecks (sans early-exit) et considère les critères null comme non-bloquants.
   * Cela permet de gérer le cas où certaines données (ex: zone_dexposition) ne sont pas
   * re-saisies par l'agent lors de l'édition.
   */
  evaluateForEdition(answers: PartialRGASimulationData): {
    result: EligibilityResult;
    checks: EligibilityChecks;
  } {
    const checks = evaluateAllChecks(answers);

    // En mode édition, un critère est bloquant seulement s'il est explicitement false
    // Les critères null (non évalués) sont ignorés
    const hasAnyFailed = Object.values(checks).some((v) => v === false);

    if (hasAnyFailed) {
      const reason = getReasonFromChecks(checks);
      return {
        result: createNonEligibleResult("resultat", reason ?? EligibilityReason.APPARTEMENT, checks),
        checks,
      };
    }

    return {
      result: createEligibleResult("resultat", checks),
      checks,
    };
  },

  /**
   * Retourne le message utilisateur pour une raison de non-éligibilité
   */
  getReasonMessage(reason: EligibilityReason): string {
    return ELIGIBILITY_REASON_MESSAGES[reason];
  },

  /**
   * Convertit les réponses partielles en données RGA complètes pour la DB
   */
  toRGASimulationData(answers: PartialRGASimulationData): RGASimulationData | null {
    if (!isSimulationComplete(answers)) {
      return null;
    }

    return {
      ...answers,
      simulatedAt: new Date().toISOString(),
    } as RGASimulationData;
  },
};

/**
 * Trouve la première raison d'échec dans les checks
 */
function getReasonFromChecks(checks: EligibilityChecks): EligibilityReason | null {
  if (checks.maison === false) return EligibilityReason.APPARTEMENT;
  if (checks.departementEligible === false) return EligibilityReason.DEPARTEMENT_NON_ELIGIBLE;
  if (checks.zoneForte === false) return EligibilityReason.ZONE_NON_FORTE;
  if (checks.anneeConstruction === false) return EligibilityReason.CONSTRUCTION_RECENTE;
  if (checks.niveaux === false) return EligibilityReason.TROP_DE_NIVEAUX;
  if (checks.etatMaison === false) return EligibilityReason.MAISON_ENDOMMAGEE;
  if (checks.nonMitoyen === false) return EligibilityReason.MAISON_MITOYENNE;
  if (checks.indemnisation === false) return EligibilityReason.DEJA_INDEMNISE;
  if (checks.assurance === false) return EligibilityReason.NON_ASSURE;
  if (checks.proprietaireOccupant === false) return EligibilityReason.NON_PROPRIETAIRE_OCCUPANT;
  if (checks.revenusEligibles === false) return EligibilityReason.REVENUS_TROP_ELEVES;
  return null;
}
