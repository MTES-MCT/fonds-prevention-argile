import { Status } from "@/shared/domain/value-objects/status.enum";
import { StatutValidationAmo } from "@/shared/domain/value-objects/statut-validation-amo.enum";

/**
 * Discriminant du type de responsable. Garde la cohérence des littéraux entre
 * le type `Responsable` et les comparaisons (switch, garde…).
 */
export const RESPONSABLE_TYPE = {
  AV: "AV",
  AMO: "AMO",
  MENAGE: "MENAGE",
  DDT: "DDT",
  ARCHIVE: "ARCHIVE",
} as const;

export type ResponsableType = (typeof RESPONSABLE_TYPE)[keyof typeof RESPONSABLE_TYPE];

/**
 * Responsable d'un dossier à l'instant T (calculé à la volée).
 * Discriminated union sur `type`.
 */
export type Responsable =
  | { type: typeof RESPONSABLE_TYPE.ARCHIVE }
  | {
      type: typeof RESPONSABLE_TYPE.AV;
      structureId: string | null;
      structureNom: string;
      codeDepartement: string | null;
    }
  | {
      type: typeof RESPONSABLE_TYPE.AMO;
      entrepriseId: string;
      entrepriseNom: string;
      codeDepartement: string | null;
    }
  | { type: typeof RESPONSABLE_TYPE.MENAGE; codeDepartement: string | null }
  | { type: typeof RESPONSABLE_TYPE.DDT; codeDepartement: string | null };

export interface ResponsableInput {
  currentStatus: Status;
  archivedAt: Date | null;
  validation: {
    statut: StatutValidationAmo;
    entreprise: { id: string; nom: string } | null;
  } | null;
  codeDepartement: string | null;
  /**
   * Aller-vers territorial associé au département du logement.
   * Sert à nommer le responsable AV quand le parcours n'a pas d'agent créateur
   * (ex : parcours initié par le demandeur via le simulateur public).
   */
  allersVersTerritorial: { id: string; nom: string } | null;
}

/**
 * Règle métier :
 * - Dossier archivé ou validation refusée → ARCHIVE.
 * - Pas de validation AMO (pré-éligibilité) ou renonciation (SANS_AMO) → AV territorial.
 * - Validation AMO `EN_ATTENTE` → AMO (doit qualifier l'éligibilité).
 * - Validation AMO `LOGEMENT_ELIGIBLE` :
 *   • Étape en instruction par la DDT (`EN_INSTRUCTION`) → DDT.
 *   • Étape en attente du ménage (`TODO` ou `VALIDE`) → MENAGE.
 */
export function getResponsableDossier(input: ResponsableInput): Responsable {
  const { archivedAt, validation, currentStatus, codeDepartement, allersVersTerritorial } = input;

  if (archivedAt !== null) {
    return { type: RESPONSABLE_TYPE.ARCHIVE };
  }

  if (!validation) {
    return buildAv(allersVersTerritorial, codeDepartement);
  }

  switch (validation.statut) {
    case StatutValidationAmo.LOGEMENT_NON_ELIGIBLE:
    case StatutValidationAmo.ACCOMPAGNEMENT_REFUSE:
      return { type: RESPONSABLE_TYPE.ARCHIVE };

    case StatutValidationAmo.SANS_AMO:
      return buildAv(allersVersTerritorial, codeDepartement);

    case StatutValidationAmo.EN_ATTENTE:
      return validation.entreprise
        ? {
            type: RESPONSABLE_TYPE.AMO,
            entrepriseId: validation.entreprise.id,
            entrepriseNom: validation.entreprise.nom,
            codeDepartement,
          }
        : buildAv(allersVersTerritorial, codeDepartement);

    case StatutValidationAmo.LOGEMENT_ELIGIBLE:
      if (!validation.entreprise) {
        return buildAv(allersVersTerritorial, codeDepartement);
      }
      return currentStatus === Status.EN_INSTRUCTION
        ? { type: RESPONSABLE_TYPE.DDT, codeDepartement }
        : { type: RESPONSABLE_TYPE.MENAGE, codeDepartement };
  }
}

function buildAv(
  av: { id: string; nom: string } | null,
  codeDepartement: string | null
): Extract<Responsable, { type: typeof RESPONSABLE_TYPE.AV }> {
  return {
    type: RESPONSABLE_TYPE.AV,
    structureId: av?.id ?? null,
    structureNom: av?.nom ?? "Aller-vers du territoire",
    codeDepartement,
  };
}

