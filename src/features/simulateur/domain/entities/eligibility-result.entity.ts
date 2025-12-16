import type { EligibilityReason } from "../value-objects/eligibility-reason.enum";

/**
 * Statut d'une règle d'éligibilité
 * - true : OUI (passée)
 * - false : NON (échouée)
 * - null : Non calculée (early exit avant cette règle)
 */
export type RuleStatus = boolean | null;

/**
 * Détail de toutes les règles d'éligibilité
 */
export interface EligibilityChecks {
  /** 1. Est-ce une maison ? */
  maison: RuleStatus;

  /** 2. Département éligible ? */
  departementEligible: RuleStatus;

  /** 3. Zone d'exposition forte ? */
  zoneForte: RuleStatus;

  /** 4. Condition année de construction ? */
  anneeConstruction: RuleStatus;

  /** 5. Pas plus d'un étage ? */
  niveaux: RuleStatus;

  /** 6. Maison saine ou très peu endommagée ? */
  etatMaison: RuleStatus;

  /** 7. Non mitoyenne ? */
  nonMitoyen: RuleStatus;

  /** 8. Peu ou pas indemnisé RGA ? */
  indemnisation: RuleStatus;

  /** 9. Couverte par assurance ? */
  assurance: RuleStatus;

  /** 10. Propriétaire occupant ? */
  proprietaireOccupant: RuleStatus;

  /** 11. Revenus éligibles ? */
  revenusEligibles: RuleStatus;
}

/**
 * Résultat de la vérification d'éligibilité
 */
export interface EligibilityResult {
  /** Éligible au dispositif */
  eligible: boolean;

  /** Raison de non-éligibilité (si non éligible) */
  reason?: EligibilityReason;

  /** Étape où l'éligibilité a été déterminée */
  determinedAtStep: string;

  /** Timestamp */
  determinedAt: string;

  /** Détail de toutes les règles */
  checks: EligibilityChecks;
}

/**
 * Crée un objet checks initial (tout à null)
 */
export function createInitialChecks(): EligibilityChecks {
  return {
    maison: null,
    departementEligible: null,
    zoneForte: null,
    anneeConstruction: null,
    niveaux: null,
    etatMaison: null,
    nonMitoyen: null,
    indemnisation: null,
    assurance: null,
    proprietaireOccupant: null,
    revenusEligibles: null,
  };
}

/**
 * Crée un résultat éligible
 */
export function createEligibleResult(step: string, checks: EligibilityChecks): EligibilityResult {
  return {
    eligible: true,
    determinedAtStep: step,
    determinedAt: new Date().toISOString(),
    checks,
  };
}

/**
 * Crée un résultat non éligible
 */
export function createNonEligibleResult(
  step: string,
  reason: EligibilityReason,
  checks: EligibilityChecks
): EligibilityResult {
  return {
    eligible: false,
    reason,
    determinedAtStep: step,
    determinedAt: new Date().toISOString(),
    checks,
  };
}
