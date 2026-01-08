import { EligibilityReason } from "../../value-objects/eligibility-reason.enum";
import { MONTANT_INDEMNISATION_MAXIMUM } from "../../value-objects/simulation-constants";
import { RuleResult } from "../rule-result.types";

interface IndemnisationData {
  dejaIndemnise?: boolean;
  avantJuillet2025?: boolean;
  avantJuillet2015?: boolean;
  montant?: number;
}

/**
 * Vérifie l'indemnisation RGA passée selon l'arrêté du 6 septembre 2025
 *
 * Non éligible si :
 * - Indemnisé APRÈS le 30 juin 2025 (quelque soit le montant)
 * - Indemnisé ENTRE le 1er juillet 2015 et le 30 juin 2025 ET montant > 10 000 €
 *
 * Éligible si :
 * - Jamais indemnisé
 * - Indemnisé AVANT le 1er juillet 2015 (quelque soit le montant)
 * - Indemnisé ENTRE le 1er juillet 2015 et le 30 juin 2025 ET montant ≤ 10 000 €
 */
export function checkIndemnisation(data: IndemnisationData | undefined): RuleResult {
  // Pas encore répondu
  if (data?.dejaIndemnise === undefined) {
    return { passed: true };
  }

  // Jamais indemnisé → Éligible
  if (data.dejaIndemnise === false) {
    return { passed: true };
  }

  // Indemnisé : vérifier la date
  if (data.avantJuillet2025 === undefined) {
    return { passed: true }; // Pas encore répondu à cette question
  }

  // Indemnisé APRÈS le 30 juin 2025 → Non éligible
  if (data.avantJuillet2025 === false) {
    return {
      passed: false,
      reason: EligibilityReason.DEJA_INDEMNISE,
    };
  }

  // Indemnisé AVANT le 1er juillet 2025 : vérifier si avant 2015
  if (data.avantJuillet2015 === undefined) {
    return { passed: true }; // Pas encore répondu à cette question
  }

  // Indemnisé AVANT le 1er juillet 2015 → Éligible (quelque soit le montant)
  if (data.avantJuillet2015 === true) {
    return { passed: true };
  }

  // Indemnisé ENTRE le 1er juillet 2015 et le 30 juin 2025 → vérifier le montant
  const montant = data.montant ?? 0;
  const passed = montant <= MONTANT_INDEMNISATION_MAXIMUM;

  return {
    passed,
    reason: passed ? undefined : EligibilityReason.DEJA_INDEMNISE,
  };
}
