import { pgEnum } from "drizzle-orm/pg-core";
import { Status } from "@/shared/domain/value-objects/status.enum";
import { Step } from "@/shared/domain/value-objects/step.enum";
import { DSStatus } from "@/shared/domain/value-objects/ds-status.enum";
import { StatutValidationAmo } from "@/shared/domain/value-objects/statut-validation-amo.enum";

/**
 * PgEnums pour la base de données PostgreSQL
 * Utilisés uniquement dans les schémas Drizzle
 */

export const stepPgEnum = pgEnum("step", [
  Step.CHOIX_AMO,
  Step.ELIGIBILITE,
  Step.DIAGNOSTIC,
  Step.DEVIS,
  Step.FACTURES,
]);

export const statusPgEnum = pgEnum("status", [Status.TODO, Status.EN_INSTRUCTION, Status.VALIDE]);

export const dsStatusPgEnum = pgEnum("ds_status", [
  DSStatus.EN_CONSTRUCTION,
  DSStatus.EN_INSTRUCTION,
  DSStatus.ACCEPTE,
  DSStatus.REFUSE,
  DSStatus.CLASSE_SANS_SUITE,
  DSStatus.NON_ACCESSIBLE,
]);

export const statutValidationAmoPgEnum = pgEnum("statut_validation_amo", [
  StatutValidationAmo.EN_ATTENTE,
  StatutValidationAmo.LOGEMENT_ELIGIBLE,
  StatutValidationAmo.LOGEMENT_NON_ELIGIBLE,
  StatutValidationAmo.ACCOMPAGNEMENT_REFUSE,
]);
