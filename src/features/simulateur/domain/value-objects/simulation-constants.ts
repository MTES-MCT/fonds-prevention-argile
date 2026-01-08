/**
 * Constantes et types pour le simulateur d'éligibilité
 */

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

export const ETATS_SINISTRE = ["saine", "très peu endommagée", "endommagée"] as const;
export type EtatSinistre = (typeof ETATS_SINISTRE)[number];

export const isEtatSinistre = (value: unknown): value is EtatSinistre => {
  return typeof value === "string" && ETATS_SINISTRE.includes(value as EtatSinistre);
};

/**
 * Ancienneté minimale de construction (en années)
 */
export const ANCIENNETE_MINIMALE_CONSTRUCTION = 15;

/**
 * Nombre maximum de niveaux autorisés
 */
export const NIVEAUX_MAXIMUM = 2;

/**
 * Montant maximum d'indemnisation passée pour rester éligible
 */
export const MONTANT_INDEMNISATION_MAXIMUM = 10000;
