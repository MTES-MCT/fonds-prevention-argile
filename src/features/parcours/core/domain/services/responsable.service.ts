import { StatutValidationAmo } from "@/shared/domain/value-objects/statut-validation-amo.enum";

/**
 * Discriminant du type de responsable. Garde la cohérence des littéraux entre
 * le type `Responsable` et les comparaisons (switch, garde…).
 *
 * Seuls trois types existent :
 *  - AV : Aller-vers rattaché à l'EPCI (fallback département) du logement.
 *  - AMO : entreprise AMO une fois qu'un accompagnement est posé (« sticky »).
 *  - INDETERMINE : aucun AV trouvé pour le territoire (ne devrait pas arriver
 *    en prod, fallback défensif).
 *
 * MENAGE, DDT et ARCHIVE ne sont **plus** des types de responsable — ce sont
 * des états du dossier (cf. `dossier-etat.service.ts`). Le responsable d'un
 * dossier validé, refusé ou archivé reste l'AMO qui l'a accompagné.
 */
export const RESPONSABLE_TYPE = {
  AV: "AV",
  AMO: "AMO",
  INDETERMINE: "INDETERMINE",
} as const;

export type ResponsableType = (typeof RESPONSABLE_TYPE)[keyof typeof RESPONSABLE_TYPE];

/**
 * Responsable d'un dossier à l'instant T (calculé à la volée).
 * Discriminated union sur `type`.
 */
export type Responsable =
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
  | { type: typeof RESPONSABLE_TYPE.INDETERMINE };

export interface ResponsableInput {
  validation: {
    statut: StatutValidationAmo;
    entreprise: { id: string; nom: string } | null;
  } | null;
  codeDepartement: string | null;
  /**
   * Aller-vers territorial associé à l'EPCI (fallback département) du logement.
   * Sert à nommer le responsable AV par défaut (parcours sans AMO ou avec
   * renonciation explicite SANS_AMO).
   */
  allersVersTerritorial: { id: string; nom: string } | null;
}

/**
 * Règle métier (responsable « sticky ») :
 *  - Si un accompagnement AMO est posé (toute validation avec une entreprise,
 *    sauf SANS_AMO) → AMO. L'AMO reste responsable pour toute la vie du dossier
 *    (validé, refusé, archivé), il ne « lâche » jamais.
 *  - Sinon → AV territorial (rattaché par EPCI, fallback département).
 *  - Si aucun AV n'est trouvé pour le territoire → INDETERMINE (fallback
 *    défensif ; en prod il y a toujours un AV).
 */
export function getResponsableDossier(input: ResponsableInput): Responsable {
  const { validation, codeDepartement, allersVersTerritorial } = input;

  if (validation && validation.entreprise && validation.statut !== StatutValidationAmo.SANS_AMO) {
    return {
      type: RESPONSABLE_TYPE.AMO,
      entrepriseId: validation.entreprise.id,
      entrepriseNom: validation.entreprise.nom,
      codeDepartement,
    };
  }

  if (allersVersTerritorial) {
    return {
      type: RESPONSABLE_TYPE.AV,
      structureId: allersVersTerritorial.id,
      structureNom: allersVersTerritorial.nom,
      codeDepartement,
    };
  }

  return { type: RESPONSABLE_TYPE.INDETERMINE };
}
