import { Status } from "@/shared/domain/value-objects/status.enum";
import { StatutValidationAmo } from "@/shared/domain/value-objects/statut-validation-amo.enum";

/**
 * État courant d'un dossier — orthogonal au responsable.
 *
 * Le « responsable » répond à « qui détient le dossier » (AV ou AMO).
 * L'« état » répond à « où en est-il / qui doit agir maintenant » :
 * - AV doit qualifier la pré-éligibilité,
 * - AMO doit valider l'éligibilité,
 * - le ménage doit transmettre des pièces,
 * - la DDT instruit,
 * - le dossier est refusé,
 * - le dossier est archivé.
 *
 * Cette séparation permet à un dossier d'avoir l'AMO comme responsable « sticky »
 * tout en étant en attente d'action du ménage ou en cours d'instruction DDT.
 *
 * À distinguer de `parcours-state.service` (machine d'état brute step+status) :
 * ici on agrège avec validation AMO + archivedAt pour catégoriser le listing.
 */
export const DOSSIER_ETAT = {
  /** Pas de validation AMO posée (ou SANS_AMO) — l'AV doit qualifier la pré-éligibilité. */
  AV_QUALIFICATION: "AV_QUALIFICATION",
  /** Validation AMO en attente — l'AMO doit confirmer l'éligibilité du logement. */
  EN_ATTENTE_AMO: "EN_ATTENTE_AMO",
  /** Validation acceptée, étape en cours d'instruction par la DDT. */
  DDT: "DDT",
  /** Validation acceptée, en attente d'action du ménage (envoi diagnostic, devis…). */
  MENAGE: "MENAGE",
  /** Validation refusée (non éligible ou accompagnement refusé). */
  REFUSE: "REFUSE",
  /** Parcours archivé manuellement. */
  ARCHIVE: "ARCHIVE",
} as const;

export type DossierEtat = (typeof DOSSIER_ETAT)[keyof typeof DOSSIER_ETAT];

/**
 * Calcule l'état d'un dossier — orthogonal au responsable.
 *
 * Règles :
 * - `archivedAt` non nul → ARCHIVE
 * - validation refusée (LOGEMENT_NON_ELIGIBLE / ACCOMPAGNEMENT_REFUSE) → REFUSE
 * - pas de validation OU SANS_AMO → AV_QUALIFICATION
 * - validation EN_ATTENTE → EN_ATTENTE_AMO
 * - validation acceptée + étape en instruction DDT → DDT
 * - validation acceptée + étape côté demandeur (TODO/VALIDE) → MENAGE
 */
export function getDossierEtat(input: {
  currentStatus: Status;
  archivedAt: Date | null;
  validation: { statut: StatutValidationAmo } | null;
}): DossierEtat {
  if (input.archivedAt !== null) {
    return DOSSIER_ETAT.ARCHIVE;
  }
  if (!input.validation) {
    return DOSSIER_ETAT.AV_QUALIFICATION;
  }
  switch (input.validation.statut) {
    case StatutValidationAmo.LOGEMENT_NON_ELIGIBLE:
    case StatutValidationAmo.ACCOMPAGNEMENT_REFUSE:
      return DOSSIER_ETAT.REFUSE;
    case StatutValidationAmo.SANS_AMO:
      return DOSSIER_ETAT.AV_QUALIFICATION;
    case StatutValidationAmo.EN_ATTENTE:
      return DOSSIER_ETAT.EN_ATTENTE_AMO;
    case StatutValidationAmo.LOGEMENT_ELIGIBLE:
      return input.currentStatus === Status.EN_INSTRUCTION ? DOSSIER_ETAT.DDT : DOSSIER_ETAT.MENAGE;
  }
}
