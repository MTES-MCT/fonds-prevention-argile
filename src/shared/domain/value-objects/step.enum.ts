export enum Step {
  INVITATION = "invitation", // Etape préalable optionnelle
  CHOIX_AMO = "choix_amo",
  ELIGIBILITE = "eligibilite",
  DIAGNOSTIC = "diagnostic",
  DEVIS = "devis",
  FACTURES = "factures",
}

export const STEP_LABELS: Record<Step, string> = {
  [Step.INVITATION]: "Invitation envoyée",
  [Step.CHOIX_AMO]: "Choix AMO",
  [Step.ELIGIBILITE]: "Éligibilité",
  [Step.DIAGNOSTIC]: "Diagnostic",
  [Step.DEVIS]: "Devis",
  [Step.FACTURES]: "Factures",
};

/**
 * Labels d'affichage des étapes.
 *
 * Les étapes "métier" CHOIX_AMO → FACTURES sont numérotées de 1 à 5 pour faciliter la lecture et la compréhension de l'avancement du projet.
 * L'étape "invitation" est une étape préalable optionnelle, elle n'est pas numérotée.
 */
export const STEP_LABELS_NUMBERED: Record<Step, string> = {
  [Step.INVITATION]: "Invitation envoyée",
  [Step.CHOIX_AMO]: "1. Choix de l'AMO",
  [Step.ELIGIBILITE]: "2. Éligibilité",
  [Step.DIAGNOSTIC]: "3. Diagnostic",
  [Step.DEVIS]: "4. Devis",
  [Step.FACTURES]: "5. Factures",
};
