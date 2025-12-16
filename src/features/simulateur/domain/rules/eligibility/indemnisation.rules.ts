import { EligibilityReason } from "../../value-objects/eligibility-reason.enum";
import { MONTANT_INDEMNISATION_MAXIMUM } from "../../value-objects/simulation-constants";
import { RuleResult } from "../rule-result.types";

interface IndemnisationData {
  dejaIndemnise: boolean;
  montant?: number;
}

/**
 * Vérifie l'indemnisation RGA passée
 * - Non indemnisé : OK
 * - Indemnisé < 10 000 € : OK
 * - Indemnisé >= 10 000 € : NON
 */
export function checkIndemnisation(data: IndemnisationData | undefined): RuleResult {
  // Pas encore répondu
  if (!data) {
    return { passed: true }; // Par défaut OK, sera vérifié à l'étape
  }

  // Jamais indemnisé
  if (!data.dejaIndemnise) {
    return { passed: true };
  }

  // Indemnisé : vérifier le montant
  const montant = data.montant ?? 0;
  const passed = montant < MONTANT_INDEMNISATION_MAXIMUM;

  return {
    passed,
    reason: passed ? undefined : EligibilityReason.DEJA_INDEMNISE,
  };
}
