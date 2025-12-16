import { EligibilityReason } from "../../value-objects/eligibility-reason.enum";
import { ANCIENNETE_MINIMALE_CONSTRUCTION, NIVEAUX_MAXIMUM } from "../../value-objects/simulation-constants";
import { RuleResult } from "../rule-result.types";

/**
 * Vérifie si le logement est une maison
 */
export function checkMaison(type: string | undefined): RuleResult {
  if (!type) {
    return { passed: false, reason: EligibilityReason.APPARTEMENT };
  }

  const isMaison = type === "maison";
  return {
    passed: isMaison,
    reason: isMaison ? undefined : EligibilityReason.APPARTEMENT,
  };
}

/**
 * Vérifie le nombre de niveaux (max 2, soit R+1)
 */
export function checkNiveaux(niveaux: number | undefined): RuleResult {
  if (niveaux === undefined) {
    return { passed: false, reason: EligibilityReason.TROP_DE_NIVEAUX };
  }

  const passed = niveaux <= NIVEAUX_MAXIMUM;
  return {
    passed,
    reason: passed ? undefined : EligibilityReason.TROP_DE_NIVEAUX,
  };
}

/**
 * Vérifie l'ancienneté de construction (min 15 ans)
 */
export function checkAnneeConstruction(anneeConstruction: string | undefined): RuleResult {
  if (!anneeConstruction) {
    return { passed: false, reason: EligibilityReason.CONSTRUCTION_RECENTE };
  }

  const annee = parseInt(anneeConstruction, 10);
  if (isNaN(annee)) {
    return { passed: false, reason: EligibilityReason.CONSTRUCTION_RECENTE };
  }

  const anneeActuelle = new Date().getFullYear();
  const anciennete = anneeActuelle - annee;
  const passed = anciennete >= ANCIENNETE_MINIMALE_CONSTRUCTION;

  return {
    passed,
    reason: passed ? undefined : EligibilityReason.CONSTRUCTION_RECENTE,
  };
}
