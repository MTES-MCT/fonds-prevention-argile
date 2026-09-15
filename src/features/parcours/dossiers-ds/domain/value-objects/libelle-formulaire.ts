import { Step } from "@/shared/domain/value-objects/step.enum";

/** Nomme le formulaire visé : « le formulaire d'éligibilité » se lit, « le formulaire éligibilité » non. */
export const LIBELLE_FORMULAIRE: Partial<Record<Step, string>> = {
  [Step.ELIGIBILITE]: "d'éligibilité",
  [Step.DIAGNOSTIC]: "de diagnostic",
  [Step.DEVIS]: "de devis",
};
