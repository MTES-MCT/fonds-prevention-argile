import { Step } from "@/shared/domain/value-objects/step.enum";
import { Status } from "@/shared/domain/value-objects/status.enum";
import { DSStatus } from "@/shared/domain/value-objects/ds-status.enum";
import { StatutValidationAmo } from "@/shared/domain/value-objects/statut-validation-amo.enum";
import type { Responsable } from "@/features/parcours/core/domain/services/responsable.service";

/**
 * Abrège un nom de structure en gardant le premier mot complet et l'initiale
 * du dernier mot (ex. "Michel Martin" → "Michel M.").
 */
export function formatResponsableShort(nom: string): string {
  const parts = nom.trim().split(/\s+/);
  if (parts.length <= 1) return nom;
  return `${parts[0]} ${parts[parts.length - 1][0]?.toUpperCase() ?? ""}.`;
}

/**
 * Libellé affichable du responsable d'un dossier : nom abrégé pour AV/AMO,
 * tiret pour les autres types (DDT, MENAGE, ARCHIVE).
 */
export function getResponsableDisplayName(responsable: Responsable): string {
  switch (responsable.type) {
    case "AV":
      return formatResponsableShort(responsable.structureNom);
    case "AMO":
      return formatResponsableShort(responsable.entrepriseNom);
    default:
      return "—";
  }
}

/**
 * Libellés d'étape conformes à la maquette du listing dossiers.
 */
export const DOSSIER_STEP_LABELS: Record<Step, string> = {
  [Step.INVITATION]: "Pré-éligibilité",
  [Step.CHOIX_AMO]: "Choix de l'AMO",
  [Step.ELIGIBILITE]: "Formulaire d'éligibilité",
  [Step.DIAGNOSTIC]: "Diagnostic logement",
  [Step.DEVIS]: "Devis",
  [Step.FACTURES]: "Factures",
};

/**
 * Étape affichée dans la colonne « Étape » :
 * - si pas de validation AMO acceptée et étape ≤ CHOIX_AMO → « Pré-éligibilité »
 * - sinon le libellé de l'étape
 * - « Non-éligible » si validation refusée (logement non éligible)
 */
export function getDossierStepLabel(
  step: Step,
  validation: { statut: StatutValidationAmo } | null
): string {
  if (validation?.statut === StatutValidationAmo.LOGEMENT_NON_ELIGIBLE) {
    return "Non-éligible";
  }
  return DOSSIER_STEP_LABELS[step];
}

type Badge = { label: string; colorClass: string };

/**
 * Badge « En attente de » dérivé du responsable.
 * Les couleurs s'inspirent du DSFR : badge--warning (orange), --new (violet),
 * --green-emeraude (vert), --info (bleu), --grey (gris).
 */
export function getResponsableBadge(responsable: Responsable): Badge {
  switch (responsable.type) {
    case "AV":
      return {
        label: `AV${responsable.codeDepartement ? ` ${responsable.codeDepartement}` : ""}`,
        colorClass: "fr-badge--warning",
      };
    case "AMO":
      return {
        label: `AMO${responsable.codeDepartement ? ` ${responsable.codeDepartement}` : ""}`,
        colorClass: "fr-badge--new",
      };
    case "MENAGE":
      return { label: "Ménage", colorClass: "fr-badge--yellow-tournesol" };
    case "DDT":
      return { label: "Instruction DDT", colorClass: "fr-badge--info" };
    case "ARCHIVE":
      return { label: "Archivé", colorClass: "fr-badge--grey" };
  }
}

/**
 * Phrase de précision (colonne « Précisions ») dérivée du responsable et de
 * l'état du dossier DS courant.
 */
export function getDossierPrecisionLabel(
  responsable: Responsable,
  currentStep: Step,
  currentStatus: Status,
  dsStatus: DSStatus | null,
  validation: { statut: StatutValidationAmo } | null
): string {
  if (validation?.statut === StatutValidationAmo.LOGEMENT_NON_ELIGIBLE) {
    return "Logement non éligible.";
  }
  if (validation?.statut === StatutValidationAmo.ACCOMPAGNEMENT_REFUSE) {
    return "Accompagnement refusé.";
  }

  switch (responsable.type) {
    case "AV":
      return "En attente de qualification de votre part.";
    case "AMO":
      return "En attente de réponse de l'AMO sur l'éligibilité.";
    case "DDT":
      return "En instruction par la DDT.";
    case "MENAGE":
      if (dsStatus === DSStatus.REFUSE) return "Refusé par la DDT — consulter la messagerie démarches.";
      if (currentStatus === Status.VALIDE) return etapeValideeLabel(currentStep);
      return etapeTodoLabel(currentStep);
    case "ARCHIVE":
      return "Dossier archivé.";
  }
}

function etapeTodoLabel(step: Step): string {
  switch (step) {
    case Step.ELIGIBILITE:
      return "Le demandeur doit remplir le formulaire d'éligibilité.";
    case Step.DIAGNOSTIC:
      return "Éligibilité validée. Le demandeur doit transmettre le diagnostic.";
    case Step.DEVIS:
      return "Diagnostic accepté. Le demandeur doit transmettre les devis.";
    case Step.FACTURES:
      return "Devis acceptés. Le demandeur doit transmettre les factures.";
    default:
      return "";
  }
}

function etapeValideeLabel(step: Step): string {
  switch (step) {
    case Step.ELIGIBILITE:
      return "Éligibilité acceptée. Passage au diagnostic.";
    case Step.DIAGNOSTIC:
      return "Diagnostic accepté. Passage aux devis.";
    case Step.DEVIS:
      return "Devis acceptés. Les travaux peuvent commencer.";
    case Step.FACTURES:
      return "Factures acceptées. Clôture à venir.";
    default:
      return "";
  }
}
