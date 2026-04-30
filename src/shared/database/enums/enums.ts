import { pgEnum } from "drizzle-orm/pg-core";
import {
  Status,
  Step,
  DSStatus,
  StatutValidationAmo,
  SituationParticulier,
  AttributionAmoMode,
  SourceAcquisition,
} from "@/shared/domain/value-objects";
import { AGENT_ROLES } from "@/shared/domain/value-objects/agent-role.enum";

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
  StatutValidationAmo.SANS_AMO,
]);

export const attributionAmoModePgEnum = pgEnum("attribution_amo_mode", [
  AttributionAmoMode.MANUEL,
  AttributionAmoMode.AUTO_OBLIGATOIRE,
  AttributionAmoMode.AUTO_AV_AMO,
  AttributionAmoMode.AUCUN,
]);

export const situationParticulierPgEnum = pgEnum("situation_particulier", [
  SituationParticulier.PROSPECT,
  SituationParticulier.ELIGIBLE,
  SituationParticulier.ARCHIVE,
]);

export const sourceAcquisitionPgEnum = pgEnum("source_acquisition", [
  SourceAcquisition.DDT,
  SourceAcquisition.AMO,
  SourceAcquisition.ALLER_VERS,
  SourceAcquisition.ECFR,
  SourceAcquisition.FLYERS,
  SourceAcquisition.MEDIAS,
  SourceAcquisition.BULLETIN_COMMUNAL,
  SourceAcquisition.PROS_BATIMENT_IMMOBILIER,
  SourceAcquisition.REUNION_PUBLIQUE_SALON,
  SourceAcquisition.MOTEUR_RECHERCHE,
  SourceAcquisition.AUTRE,
]);

export const agentRolePgEnum = pgEnum("agent_role", [
  AGENT_ROLES.ADMINISTRATEUR,
  AGENT_ROLES.SUPER_ADMINISTRATEUR,
  AGENT_ROLES.AMO,
  AGENT_ROLES.ANALYSTE,
  AGENT_ROLES.ALLERS_VERS,
  AGENT_ROLES.AMO_ET_ALLERS_VERS,
  AGENT_ROLES.ANALYSTE_DDT,
]);
