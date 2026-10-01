import { Step } from "@/shared/domain/value-objects/step.enum";
import {
  INITIATEUR_FORMULAIRE,
  type InitiateurFormulaire,
} from "@/shared/domain/value-objects/initiateur-formulaire.enum";
import { StatutValidationAmo } from "./statutValidation";

/** Étapes dont le formulaire DN revient à l'AMO mandataire financier : c'est elle qui est payée. */
export const STEPS_FORMULAIRE_PAR_AMO: readonly Step[] = [Step.DIAGNOSTIC];

/**
 * Le dossier est suivi par une AMO qui perçoit l'aide à la place du demandeur.
 * Un `estMandataireFinancier` nul vaut non-mandataire, comme pour `requiertAccordAmo`.
 */
export function estAmoMandataireFinancier(
  statutAmo: StatutValidationAmo | null,
  estMandataireFinancier: boolean | null
): boolean {
  return statutAmo === StatutValidationAmo.LOGEMENT_ELIGIBLE && estMandataireFinancier === true;
}

/** La création du formulaire de cette étape revient à l'AMO, et plus au demandeur. */
export function estFormulaireConfieAAmo(
  step: Step,
  statutAmo: StatutValidationAmo | null,
  estMandataireFinancier: boolean | null
): boolean {
  return STEPS_FORMULAIRE_PAR_AMO.includes(step) && estAmoMandataireFinancier(statutAmo, estMandataireFinancier);
}

export interface FormulaireExistant {
  initiePar: InitiateurFormulaire;
  /** Transmis à la DDT : le dossier ne changera plus de propriétaire. */
  depose: boolean;
}

/**
 * Le formulaire échappe au demandeur : rien à créer, et aucun lien DN à lui proposer.
 * Seul un dossier qu'il a lui-même déposé reste le sien ; un brouillon de l'AMO non déposé
 * ne compte plus une fois l'AMO détachée.
 */
export function estFormulaireGereParAmo(confie: boolean, formulaire: FormulaireExistant | null): boolean {
  if (!formulaire) return confie;
  if (formulaire.initiePar === INITIATEUR_FORMULAIRE.AMO) return confie || formulaire.depose;
  return confie && !formulaire.depose;
}
