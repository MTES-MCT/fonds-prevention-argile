import { pgEnum } from "drizzle-orm/pg-core";

// Enums pour les étapes et statuts
export const stepEnum = pgEnum("step", [
  "ELIGIBILITE",
  "DIAGNOSTIC",
  "DEVIS",
  "FACTURES",
]);

// Enum pour les statuts internes
export const statusEnum = pgEnum("status", [
  "TODO",
  "EN_INSTRUCTION",
  "VALIDE",
]);

// Enum pour les statuts Démarches Simplifiées
export const dsStatusEnum = pgEnum("ds_status", [
  "en_construction",
  "en_instruction",
  "accepte",
  "refuse",
  "classe_sans_suite",
]);

// Types utilitaires pour les enums
export type Step = (typeof stepEnum.enumValues)[number];
export type Status = (typeof statusEnum.enumValues)[number];
export type DSStatus = (typeof dsStatusEnum.enumValues)[number];

// Ordre des étapes
export const STEP_ORDER: Step[] = [
  "ELIGIBILITE",
  "DIAGNOSTIC",
  "DEVIS",
  "FACTURES",
] as const;

// Helper pour mapper le statut DS vers le statut interne
export function mapDSStatusToInternalStatus(dsStatus: DSStatus): Status {
  const mapping: Record<DSStatus, Status> = {
    en_construction: "TODO",
    en_instruction: "EN_INSTRUCTION",
    accepte: "VALIDE",
    refuse: "EN_INSTRUCTION",
    classe_sans_suite: "EN_INSTRUCTION",
  };
  return mapping[dsStatus];
}
