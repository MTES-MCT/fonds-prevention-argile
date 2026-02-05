export enum Step {
  CHOIX_AMO = "choix_amo",
  ELIGIBILITE = "eligibilite",
  DIAGNOSTIC = "diagnostic",
  DEVIS = "devis",
  FACTURES = "factures",
}

export const STEP_LABELS: Record<Step, string> = {
  [Step.CHOIX_AMO]: "Choix AMO",
  [Step.ELIGIBILITE]: "Éligibilité",
  [Step.DIAGNOSTIC]: "Diagnostic",
  [Step.DEVIS]: "Devis",
  [Step.FACTURES]: "Factures",
};

export const STEP_LABELS_NUMBERED: Record<Step, string> = {
  [Step.CHOIX_AMO]: "1. Choix de l'AMO",
  [Step.ELIGIBILITE]: "2. Éligibilité",
  [Step.DIAGNOSTIC]: "3. Diagnostic",
  [Step.DEVIS]: "4. Devis",
  [Step.FACTURES]: "5. Factures",
};
