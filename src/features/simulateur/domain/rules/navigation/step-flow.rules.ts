import { SimulateurStep, ETAPES_NUMEROTEES } from "../../value-objects/simulateur-step.enum";
import type { PartialRGASimulationData } from "@/shared/domain/types";
import type { EligibilityChecks } from "../../entities/eligibility-result.entity";
import {
  checkMaison,
  checkDepartementEligible,
  checkZoneForte,
  checkAnneeConstruction,
  checkNiveaux,
  checkEtatMaison,
  checkNonMitoyen,
  checkIndemnisation,
  checkAssurance,
  checkProprietaireOccupant,
  checkRevenus,
} from "../eligibility";

/**
 * Ordre complet des étapes (incluant intro et résultat)
 */
const STEP_ORDER: SimulateurStep[] = [SimulateurStep.INTRO, ...ETAPES_NUMEROTEES, SimulateurStep.RESULTAT];

/**
 * Retourne l'étape suivante (sans vérification d'éligibilité)
 */
export function getNextStep(currentStep: SimulateurStep): SimulateurStep | null {
  const currentIndex = STEP_ORDER.indexOf(currentStep);
  if (currentIndex === -1 || currentIndex >= STEP_ORDER.length - 1) {
    return null;
  }
  return STEP_ORDER[currentIndex + 1];
}

/**
 * Retourne l'étape précédente
 */
export function getPreviousStep(currentStep: SimulateurStep): SimulateurStep | null {
  const currentIndex = STEP_ORDER.indexOf(currentStep);
  if (currentIndex <= 0) {
    return null;
  }
  return STEP_ORDER[currentIndex - 1];
}

/**
 * Vérifie si on peut aller à une étape donnée
 */
export function canGoToStep(targetStep: SimulateurStep, currentStep: SimulateurStep): boolean {
  const targetIndex = STEP_ORDER.indexOf(targetStep);
  const currentIndex = STEP_ORDER.indexOf(currentStep);

  // On peut revenir en arrière ou rester sur place
  return targetIndex <= currentIndex;
}

/**
 * Évalue toutes les règles d'éligibilité avec les données actuelles
 * Retourne les checks et indique si un early exit est nécessaire
 */
export function evaluateEligibility(answers: PartialRGASimulationData): {
  checks: EligibilityChecks;
  shouldExit: boolean;
  failedAtStep: SimulateurStep | null;
} {
  const checks: EligibilityChecks = {
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

  // Étape 1 - Type logement
  if (answers.logement?.type !== undefined) {
    const result = checkMaison(answers.logement.type);
    checks.maison = result.passed;
    if (!result.passed) {
      return { checks, shouldExit: true, failedAtStep: SimulateurStep.TYPE_LOGEMENT };
    }
  }

  // Étape 2 - Adresse (plusieurs checks)
  if (answers.logement?.code_departement !== undefined) {
    const deptResult = checkDepartementEligible(answers.logement.code_departement);
    checks.departementEligible = deptResult.passed;
    if (!deptResult.passed) {
      return { checks, shouldExit: true, failedAtStep: SimulateurStep.ADRESSE };
    }
  }

  if (answers.logement?.zone_dexposition !== undefined) {
    const zoneResult = checkZoneForte(answers.logement.zone_dexposition);
    checks.zoneForte = zoneResult.passed;
    if (!zoneResult.passed) {
      return { checks, shouldExit: true, failedAtStep: SimulateurStep.ADRESSE };
    }
  }

  if (answers.logement?.annee_de_construction !== undefined) {
    const anneeResult = checkAnneeConstruction(answers.logement.annee_de_construction);
    checks.anneeConstruction = anneeResult.passed;
    if (!anneeResult.passed) {
      return { checks, shouldExit: true, failedAtStep: SimulateurStep.ADRESSE };
    }
  }

  if (answers.logement?.niveaux !== undefined) {
    const niveauxResult = checkNiveaux(answers.logement.niveaux);
    checks.niveaux = niveauxResult.passed;
    if (!niveauxResult.passed) {
      return { checks, shouldExit: true, failedAtStep: SimulateurStep.ADRESSE };
    }
  }

  // Étape 3 - État maison
  if (answers.rga?.sinistres !== undefined) {
    const etatResult = checkEtatMaison(answers.rga.sinistres);
    checks.etatMaison = etatResult.passed;
    if (!etatResult.passed) {
      return { checks, shouldExit: true, failedAtStep: SimulateurStep.ETAT_MAISON };
    }
  }

  // Étape 4 - Mitoyenneté
  if (answers.logement?.mitoyen !== undefined) {
    const mitoyenResult = checkNonMitoyen(answers.logement.mitoyen);
    checks.nonMitoyen = mitoyenResult.passed;
    if (!mitoyenResult.passed) {
      return { checks, shouldExit: true, failedAtStep: SimulateurStep.MITOYENNETE };
    }
  }

  // Étape 5 - Indemnisation
  if (answers.rga?.indemnise_indemnise_rga !== undefined) {
    const indemnisationResult = checkIndemnisation({
      dejaIndemnise: answers.rga.indemnise_indemnise_rga,
      montant: answers.rga.indemnise_montant_indemnite,
    });
    checks.indemnisation = indemnisationResult.passed;
    if (!indemnisationResult.passed) {
      return { checks, shouldExit: true, failedAtStep: SimulateurStep.INDEMNISATION };
    }
  }

  // Étape 6 - Assurance
  if (answers.rga?.assure !== undefined) {
    const assuranceResult = checkAssurance(answers.rga.assure);
    checks.assurance = assuranceResult.passed;
    if (!assuranceResult.passed) {
      return { checks, shouldExit: true, failedAtStep: SimulateurStep.ASSURANCE };
    }
  }

  // Étape 7 - Propriétaire occupant
  if (answers.logement?.proprietaire_occupant !== undefined) {
    const propResult = checkProprietaireOccupant(answers.logement.proprietaire_occupant);
    checks.proprietaireOccupant = propResult.passed;
    if (!propResult.passed) {
      return { checks, shouldExit: true, failedAtStep: SimulateurStep.PROPRIETAIRE };
    }
  }

  // Étape 8 - Revenus
  if (
    answers.menage?.personnes !== undefined &&
    answers.menage?.revenu_rga !== undefined &&
    answers.logement?.code_region !== undefined
  ) {
    const revenusResult = checkRevenus({
      nombrePersonnes: answers.menage.personnes,
      revenuFiscalReference: answers.menage.revenu_rga,
      codeRegion: answers.logement.code_region,
    });
    checks.revenusEligibles = revenusResult.passed;
    if (!revenusResult.passed) {
      return { checks, shouldExit: true, failedAtStep: SimulateurStep.REVENUS };
    }
  }

  return { checks, shouldExit: false, failedAtStep: null };
}

/**
 * Détermine si la simulation est complète (toutes les étapes remplies)
 */
export function isSimulationComplete(answers: PartialRGASimulationData): boolean {
  return (
    answers.logement?.type !== undefined &&
    answers.logement?.code_departement !== undefined &&
    answers.logement?.zone_dexposition !== undefined &&
    answers.logement?.annee_de_construction !== undefined &&
    answers.logement?.niveaux !== undefined &&
    answers.rga?.sinistres !== undefined &&
    answers.logement?.mitoyen !== undefined &&
    answers.rga?.indemnise_indemnise_rga !== undefined &&
    answers.rga?.assure !== undefined &&
    answers.logement?.proprietaire_occupant !== undefined &&
    answers.menage?.personnes !== undefined &&
    answers.menage?.revenu_rga !== undefined
  );
}
