import { pgEnum } from "drizzle-orm/pg-core";
import { Status, Step, DSStatus, StatutValidationAmo, AgentRole } from "@/shared/domain/value-objects";

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

export const agentRolePgEnum = pgEnum("agent_role", [AgentRole.ADMIN, AgentRole.INSTRUCTEUR, AgentRole.AMO]);
