// Une structure d'accompagnement porte AMO et/ou Aller-vers ; une structure expert ne porte que l'expertise.
export const TYPES_STRUCTURE = ["accompagnement", "expert"] as const;

export type TypeStructure = (typeof TYPES_STRUCTURE)[number];
