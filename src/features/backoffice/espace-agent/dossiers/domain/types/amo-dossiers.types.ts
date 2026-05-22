import type React from "react";
import { Status } from "@/shared/domain/value-objects/status.enum";
import { StatutValidationAmo } from "@/shared/domain/value-objects/statut-validation-amo.enum";

/**
 * Statuts qui font apparaître un dossier dans l'onglet « Suivis » (vs archivés).
 */
export const STATUTS_SUIVIS = [StatutValidationAmo.EN_ATTENTE, StatutValidationAmo.LOGEMENT_ELIGIBLE];

/**
 * Statuts considérés comme refusés (le dossier est archivé de fait).
 */
export const STATUTS_REFUSES = [StatutValidationAmo.LOGEMENT_NON_ELIGIBLE, StatutValidationAmo.ACCOMPAGNEMENT_REFUSE];

/**
 * Statuts pour lesquels la page detail `/dossiers/[id]` est consultable.
 * SUIVIS + REFUSES : un dossier archivé non éligible reste lisible côté agent
 * pour consulter le motif d'inéligibilité.
 */
export const STATUTS_CONSULTABLES = [...STATUTS_SUIVIS, ...STATUTS_REFUSES];

/**
 * Variantes visuelles pour la cellule « Précisions ».
 */
type PrecisionVariant = "en_construction" | "en_instruction" | "archive";

const PRECISION_COLORS: Record<PrecisionVariant, string> = {
  en_construction: "#feebd0",
  en_instruction: "#dae6fd",
  archive: "#dddddd",
};

function getPrecisionVariant(statut: Status, isArchived: boolean): PrecisionVariant {
  if (isArchived) return "archive";
  if (statut === Status.EN_INSTRUCTION) return "en_instruction";
  return "en_construction";
}

/**
 * Style inline pour la cellule « Précisions » : bordure gauche colorée
 * selon le statut courant et l'état archivé du dossier.
 */
export function getPrecisionStyle(statut: Status, isArchived: boolean): React.CSSProperties {
  const color = PRECISION_COLORS[getPrecisionVariant(statut, isArchived)];
  return {
    boxShadow: `inset 8px 0 0 0 ${color}`,
  };
}
