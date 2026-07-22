import { Step } from "@/shared/domain/value-objects/step.enum";
import { Status } from "@/shared/domain/value-objects/status.enum";
import { DSStatus } from "@/shared/domain/value-objects/ds-status.enum";
import { StatutValidationAmo } from "@/shared/domain/value-objects/statut-validation-amo.enum";
import { formatDate } from "@/shared/utils/date.utils";
import type { Responsable } from "@/features/parcours/core/domain/services/responsable.service";
import type { DossierEtat } from "@/features/parcours/core/domain/services/dossier-etat.service";

/**
 * Libellé affichable du responsable d'un dossier : nom complet de la structure
 * pour AV/AMO, tiret pour les autres types (DDT, MENAGE, ARCHIVE).
 */
export function getResponsableDisplayName(responsable: Responsable): string {
  switch (responsable.type) {
    case "AV":
      return responsable.structureNom;
    case "AMO":
      return responsable.entrepriseNom;
    default:
      return "—";
  }
}

export type ResponsableTabId = "mes-dossiers" | "AV" | "AMO" | "MENAGE" | "DDT" | "ARCHIVE";

/**
 * Construit le libellé d'un onglet « En attente de » en suffixant
 * éventuellement avec le ou les départements présents dans le scope.
 */
export function getResponsableTabLabel(prefix: string, codesDepartement: string[]): string {
  if (codesDepartement.length === 0) return prefix;
  if (codesDepartement.length === 1) return `${prefix} ${codesDepartement[0]}`;
  return `${prefix} (${codesDepartement.length})`;
}

/**
 * Libellés étendus des KPIs affichés en cartes au-dessus du listing.
 * Mêmes catégories que les onglets responsable, version longue.
 */
export const RESPONSABLE_KPI_LABELS: Record<Exclude<ResponsableTabId, "mes-dossiers" | "ARCHIVE">, string> = {
  AV: "Pré-éligibilité à vérifier",
  AMO: "Demande AMO en attente",
  MENAGE: "Actions Ménages attendues",
  DDT: "Instructions DDT en cours",
};

/**
 * Libellés d'étape conformes à la maquette du listing dossiers.
 */
export const DOSSIER_STEP_LABELS: Record<Step, string> = {
  [Step.INVITATION]: "Création de compte",
  [Step.CHOIX_AMO]: "Choix de l'AMO",
  [Step.ELIGIBILITE]: "Formulaire d'éligibilité",
  [Step.DIAGNOSTIC]: "Diagnostic logement",
  [Step.DEVIS]: "Devis",
  [Step.FACTURES]: "Factures",
};

/**
 * Étape affichée dans la colonne « Étape » :
 * - si pas de validation AMO acceptée et étape ≤ CHOIX_AMO → « Création de compte »
 * - sinon le libellé de l'étape
 * - « Non-éligible » si validation refusée (logement non éligible)
 */
export function getDossierStepLabel(step: Step, validation: { statut: StatutValidationAmo } | null): string {
  if (validation?.statut === StatutValidationAmo.LOGEMENT_NON_ELIGIBLE) {
    return "Non-éligible";
  }
  return DOSSIER_STEP_LABELS[step];
}

type Badge = { label: string; colorClass: string };

/**
 * Badge « En attente de » dérivé de l'état du dossier (qui doit agir).
 *
 * Les couleurs s'inspirent du DSFR : badge--warning (orange), --new (violet),
 * --green-emeraude (vert), --info (bleu), --grey (gris).
 *
 * Le `codeDepartement` n'est utilisé que pour les états où le badge mentionne
 * le département (AV_QUALIFICATION, EN_ATTENTE_AMO).
 */
export function getEtatBadge(etat: DossierEtat, codeDepartement: string | null): Badge {
  switch (etat) {
    case "AV_QUALIFICATION":
      return {
        label: `Aller-Vers${codeDepartement ? ` ${codeDepartement}` : ""}`,
        colorClass: "fr-badge--warning",
      };
    case "EN_ATTENTE_AMO":
      return {
        label: `AMO${codeDepartement ? ` ${codeDepartement}` : ""}`,
        colorClass: "fr-badge--new",
      };
    case "MENAGE":
      return { label: "Ménage", colorClass: "fr-badge--yellow-tournesol" };
    case "DDT":
      return { label: "Instruction DDT", colorClass: "fr-badge--info" };
    case "REFUSE":
      return { label: "Refusé", colorClass: "fr-badge--grey" };
    case "ARCHIVE":
      return { label: "Archivé", colorClass: "fr-badge--grey" };
  }
}

/**
 * Phrase de précision (colonne « Précisions ») dérivée de l'état du dossier
 * et de l'état du dossier DS courant.
 */
export function getDossierPrecisionLabel(
  etat: DossierEtat,
  currentStep: Step,
  currentStatus: Status,
  dsStatus: DSStatus | null,
  validation: { statut: StatutValidationAmo } | null,
  dossierCreatedAt: Date | null,
  submittedAt: Date | null,
  instructedAt: Date | null
): string {
  if (validation?.statut === StatutValidationAmo.LOGEMENT_NON_ELIGIBLE) {
    return "Logement non éligible.";
  }
  if (validation?.statut === StatutValidationAmo.ACCOMPAGNEMENT_REFUSE) {
    return "Accompagnement refusé.";
  }

  switch (etat) {
    case "AV_QUALIFICATION":
      return "En attente de qualification de votre part.";
    case "EN_ATTENTE_AMO":
      return "En attente de réponse de l'AMO sur l'éligibilité.";
    case "DDT":
      return "En instruction par la DDT.";
    case "MENAGE":
      if (dsStatus === DSStatus.REFUSE) return "Refusé par la DDT — consulter la messagerie démarches.";
      if (currentStatus === Status.VALIDE) return etapeValideeLabel(currentStep);
      // Déposé puis renvoyé en construction par la DDT (déjà instruit une fois) → correction attendue (cf. ADR-0009).
      if (dsStatus === DSStatus.EN_CONSTRUCTION && instructedAt != null) return etapeCorrectionLabel(currentStep);
      if (currentStep === Step.ELIGIBILITE) return eligibiliteTodoLabel(dossierCreatedAt, submittedAt);
      return etapeTodoLabel(currentStep);
    case "REFUSE":
      // Couvert par les early returns ci-dessus pour les libellés détaillés ;
      // ce fallback ne devrait pas être atteint en pratique.
      return "Dossier refusé.";
    case "ARCHIVE":
      return "Dossier archivé.";
  }
}

/**
 * Précision fine de l'étape éligibilité dans le bucket « todo » (pas encore instruit) :
 * distingue pas de brouillon / brouillon créé / dossier déposé, avec la date de la
 * dernière action correspondante (cf. ADR-0009 pour la sémantique créé vs déposé).
 */
function eligibiliteTodoLabel(dossierCreatedAt: Date | null, submittedAt: Date | null): string {
  if (!dossierCreatedAt) {
    return "Le demandeur doit remplir le formulaire d'éligibilité.";
  }
  if (!submittedAt) {
    return `Brouillon d'éligibilité créé le ${formatDate(dossierCreatedAt.toISOString())}. Le demandeur doit le déposer.`;
  }
  return `Dossier d'éligibilité déposé le ${formatDate(submittedAt.toISOString())}, en attente d'instruction par la DDT.`;
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

function etapeCorrectionLabel(step: Step): string {
  switch (step) {
    case Step.ELIGIBILITE:
      return "Le demandeur doit corriger son formulaire d'éligibilité.";
    case Step.DIAGNOSTIC:
      return "Le demandeur doit corriger son diagnostic.";
    case Step.DEVIS:
      return "Le demandeur doit corriger ses devis.";
    case Step.FACTURES:
      return "Le demandeur doit corriger ses factures.";
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
