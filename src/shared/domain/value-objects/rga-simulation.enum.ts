// Sans aucun import : le schéma Drizzle charge ce fichier via rga-simulation.types, rien de React ne doit suivre.
export const ZONES_EXPOSITION = ["faible", "moyen", "fort"] as const;
export type ZoneExposition = (typeof ZONES_EXPOSITION)[number];

export const isZoneExposition = (value: unknown): value is ZoneExposition => {
  return typeof value === "string" && ZONES_EXPOSITION.includes(value as ZoneExposition);
};

export const TYPES_LOGEMENT = ["maison", "appartement"] as const;
export type TypeLogement = (typeof TYPES_LOGEMENT)[number];

export const isTypeLogement = (value: unknown): value is TypeLogement => {
  return typeof value === "string" && TYPES_LOGEMENT.includes(value as TypeLogement);
};

export const ETATS_SINISTRE = ["saine", "très peu endommagée", "endommagée", "très endommagée"] as const;
export type EtatSinistre = (typeof ETATS_SINISTRE)[number];

export const isEtatSinistre = (value: unknown): value is EtatSinistre => {
  return typeof value === "string" && ETATS_SINISTRE.includes(value as EtatSinistre);
};
