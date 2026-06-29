import { Status } from "@/shared/domain/value-objects/status.enum";
import { StatutValidationAmo } from "@/shared/domain/value-objects/statut-validation-amo.enum";
import { DSStatus } from "@/shared/domain/value-objects/ds-status.enum";

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
  /** Pas de validation AMO posée (prospect créé par l'AV) — l'AV doit qualifier la pré-éligibilité. */
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
 * - pas de validation (prospect créé par l'AV, encore en pré-éligibilité) → AV_QUALIFICATION
 * - validation EN_ATTENTE → EN_ATTENTE_AMO
 * - validation acceptée (LOGEMENT_ELIGIBLE) OU SANS_AMO → DDT/MENAGE selon « qui détient la
 *   balle ». SANS_AMO (renonciation explicite) n'attend AUCUNE qualification AV : le parcours
 *   a déjà avancé à l'éligibilité (cf. amo-selection.service `skipAmoStepForUser`), seul le
 *   responsable diffère (AV au lieu d'AMO, calculé dans responsable.service).
 *
 * Pour une validation acceptée ou SANS_AMO, la balle est à la DDT dès que le dossier est déposé
 * et tant qu'il n'est pas (re)passé côté ménage (cf. ADR-0009) :
 * - `ds_status = EN_INSTRUCTION` → DDT (instruction en cours)
 * - `ds_status = EN_CONSTRUCTION` (déposé) :
 *     - sans `instructedAt` → premier dépôt en attente de prise en instruction → DDT
 *     - avec `instructedAt` → renvoyé pour correction par la DDT → MENAGE
 * - sinon (pas encore déposé, accepté, refusé…) → suit le `current_status` interne
 *   (`EN_INSTRUCTION` → DDT, sinon MENAGE).
 *
 * `dsStatus`/`instructedAt` sont optionnels : sans eux, on retombe sur `current_status`.
 */
export function getDossierEtat(input: {
  currentStatus: Status;
  archivedAt: Date | null;
  validation: { statut: StatutValidationAmo } | null;
  dsStatus?: DSStatus | null;
  instructedAt?: Date | null;
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
    case StatutValidationAmo.EN_ATTENTE:
      return DOSSIER_ETAT.EN_ATTENTE_AMO;
    // SANS_AMO suit la même progression qu'une éligibilité acceptée : pas de gate AV.
    case StatutValidationAmo.SANS_AMO:
    case StatutValidationAmo.LOGEMENT_ELIGIBLE:
      if (input.dsStatus === DSStatus.EN_INSTRUCTION) {
        return DOSSIER_ETAT.DDT;
      }
      if (input.dsStatus === DSStatus.EN_CONSTRUCTION) {
        return input.instructedAt == null ? DOSSIER_ETAT.DDT : DOSSIER_ETAT.MENAGE;
      }
      return input.currentStatus === Status.EN_INSTRUCTION ? DOSSIER_ETAT.DDT : DOSSIER_ETAT.MENAGE;
  }
}
