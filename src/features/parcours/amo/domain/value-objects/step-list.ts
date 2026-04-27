import { Step, STEP_LABELS_NUMBERED } from "@/shared/domain/value-objects/step.enum";
import { StatutValidationAmo } from "@/shared/domain/value-objects/statut-validation-amo.enum";
import { AmoMode } from "./departements-amo";

/**
 * Items affichés dans la sidebar `MaListe` côté `/mon-compte`.
 * Le label et la position du 1er item dépendent du mode AMO + statut de validation.
 */
export interface StepListItem {
  key: string;
  label: string;
  state: "completed" | "active" | "pending";
  /** Étape DS associée (ELIGIBILITE, DIAGNOSTIC, DEVIS, FACTURES) — utilisée par MaListe pour récupérer l'URL DS. */
  step?: Step;
  /** Item lié à l'étape AMO (ancre interne #choix-amo). */
  isAmoAnchor?: boolean;
}

const LABEL_CHOIX_ACCOMPAGNEMENT = "Choix de l'accompagnement";
const LABEL_ATTENTE_REPONSE_AMO = "Attendre la réponse de votre AMO";
const LABEL_ELIGIBILITE = "Remplir le formulaire d'éligibilité et avoir une réponse";
const LABEL_DIAGNOSTIC = "Soumettre le diagnostic";
const LABEL_DEVIS = "Soumettre les devis";
const LABEL_FACTURES = "Transmettre les factures";

const STEP_ORDER: readonly Step[] = [
  Step.CHOIX_AMO,
  Step.ELIGIBILITE,
  Step.DIAGNOSTIC,
  Step.DEVIS,
  Step.FACTURES,
];

/**
 * Calcule l'état d'une étape DS par rapport à l'étape courante du parcours.
 * - Avant currentStep → completed (line-through)
 * - À currentStep → completed si DS accepté, sinon active
 * - Après currentStep → pending (disabled)
 */
function dsItemState(step: Step, currentStep: Step | null, isCurrentDSStepAccepte: boolean): StepListItem["state"] {
  const cs = currentStep ?? Step.CHOIX_AMO;
  const stepIdx = STEP_ORDER.indexOf(step);
  const currentIdx = STEP_ORDER.indexOf(cs);
  if (stepIdx < currentIdx) return "completed";
  if (stepIdx > currentIdx) return "pending";
  return isCurrentDSStepAccepte ? "completed" : "active";
}

const DS_TAIL_ITEMS: ReadonlyArray<{ key: string; label: string; step: Step }> = [
  { key: "eligibilite", label: LABEL_ELIGIBILITE, step: Step.ELIGIBILITE },
  { key: "diagnostic", label: LABEL_DIAGNOSTIC, step: Step.DIAGNOSTIC },
  { key: "devis", label: LABEL_DEVIS, step: Step.DEVIS },
  { key: "factures", label: LABEL_FACTURES, step: Step.FACTURES },
];

function buildDsTail(currentStep: Step | null, isCurrentDSStepAccepte: boolean): StepListItem[] {
  return DS_TAIL_ITEMS.map(({ key, label, step }) => ({
    key,
    label,
    step,
    state: dsItemState(step, currentStep, isCurrentDSStepAccepte),
  }));
}

/**
 * Retourne la liste des items à afficher dans la sidebar selon le mode AMO et le statut.
 */
export function getStepListItems(
  amoMode: AmoMode | null,
  statutAmo: StatutValidationAmo | null,
  currentStep: Step | null,
  isCurrentDSStepAccepte: boolean
): StepListItem[] {
  const dsTail = buildDsTail(currentStep, isCurrentDSStepAccepte);
  const onChoixAmo = currentStep === Step.CHOIX_AMO;

  // Mode OBLIGATOIRE / AV_AMO_FUSIONNES : un seul item AMO ("Attendre la réponse de votre AMO")
  if (amoMode === AmoMode.OBLIGATOIRE || amoMode === AmoMode.AV_AMO_FUSIONNES) {
    return [
      {
        key: "amo",
        label: LABEL_ATTENTE_REPONSE_AMO,
        state: onChoixAmo ? "active" : "completed",
        isAmoAnchor: true,
      },
      ...dsTail,
    ];
  }

  // Mode FACULTATIF (par défaut si amoMode null le temps du chargement aussi)
  // Cas 1 : aucune réponse encore → un seul item "Choix de l'accompagnement" actif
  if (statutAmo === null) {
    return [
      {
        key: "choix-accompagnement",
        label: LABEL_CHOIX_ACCOMPAGNEMENT,
        state: onChoixAmo ? "active" : "completed",
        isAmoAnchor: true,
      },
      ...dsTail,
    ];
  }

  // Cas 2 : SANS_AMO → "Choix de l'accompagnement" validé, pas d'attente AMO
  if (statutAmo === StatutValidationAmo.SANS_AMO) {
    return [
      {
        key: "choix-accompagnement",
        label: LABEL_CHOIX_ACCOMPAGNEMENT,
        state: "completed",
        isAmoAnchor: true,
      },
      ...dsTail,
    ];
  }

  // Cas 3 : AMO sélectionné (EN_ATTENTE / LOGEMENT_ELIGIBLE / NON_ELIGIBLE / ACCOMPAGNEMENT_REFUSE)
  // → 2 items en tête : choix validé + attente de la réponse de l'AMO
  return [
    {
      key: "choix-accompagnement",
      label: LABEL_CHOIX_ACCOMPAGNEMENT,
      state: "completed",
      isAmoAnchor: true,
    },
    {
      key: "amo",
      label: LABEL_ATTENTE_REPONSE_AMO,
      state: onChoixAmo ? "active" : "completed",
      isAmoAnchor: true,
    },
    ...dsTail,
  ];
}

/**
 * Label du badge d'étape affiché dans le header de `/mon-compte`.
 * Reste court (suit les maquettes : "1. AMO" plutôt que "1. Choix de l'AMO").
 * Pour les autres étapes, on garde les labels existants `STEP_LABELS_NUMBERED`.
 */
export function getStepBadgeLabel(currentStep: Step | null): string {
  if (!currentStep) return "";
  if (currentStep === Step.CHOIX_AMO) return "1. AMO";
  return STEP_LABELS_NUMBERED[currentStep];
}
