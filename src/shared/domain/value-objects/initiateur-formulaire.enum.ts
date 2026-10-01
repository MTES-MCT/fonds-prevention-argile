/** Qui a créé le prérempli DN d'une étape : c'est son compte DN qui en devient propriétaire. */
export const INITIATEUR_FORMULAIRE = {
  DEMANDEUR: "demandeur",
  AMO: "amo",
} as const;

export type InitiateurFormulaire = (typeof INITIATEUR_FORMULAIRE)[keyof typeof INITIATEUR_FORMULAIRE];
