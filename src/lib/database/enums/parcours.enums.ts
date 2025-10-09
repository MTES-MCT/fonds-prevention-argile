import { pgEnum } from "drizzle-orm/pg-core";
import { Step, Status, DSStatus } from "@/lib/parcours/parcours.types";
import { StatutValidationAmo } from "@/lib/parcours/amo/amo.types";

/**
 * PgEnums pour la base de données PostgreSQL
 * Utilisés uniquement dans les schémas Drizzle
 */

/**
 * Enum PostgreSQL pour les étapes
 */
export const stepPgEnum = pgEnum("step", [
  Step.CHOIX_AMO,
  Step.ELIGIBILITE,
  Step.DIAGNOSTIC,
  Step.DEVIS,
  Step.FACTURES,
]);

/**
 * Enum PostgreSQL pour les statuts internes
 */
export const statusPgEnum = pgEnum("status", [
  Status.TODO,
  Status.EN_INSTRUCTION,
  Status.VALIDE,
]);

/**
 * Enum PostgreSQL pour les statuts Démarches Simplifiées
 */
export const dsStatusPgEnum = pgEnum("ds_status", [
  DSStatus.EN_CONSTRUCTION,
  DSStatus.EN_INSTRUCTION,
  DSStatus.ACCEPTE,
  DSStatus.REFUSE,
  DSStatus.CLASSE_SANS_SUITE,
  DSStatus.NON_ACCESSIBLE, // Statut ajouté pour "Non accessible"
]);

export const statutValidationAmoPgEnum = pgEnum("statut_validation_amo", [
  StatutValidationAmo.EN_ATTENTE,
  StatutValidationAmo.VALIDE,
  StatutValidationAmo.REFUSE,
]);
