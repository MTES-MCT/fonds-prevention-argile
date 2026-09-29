/**
 * Constantes et types pour le simulateur d'éligibilité
 */

// Source unique partagée avec le type JSONB de la base.
export {
  ZONES_EXPOSITION,
  isZoneExposition,
  TYPES_LOGEMENT,
  isTypeLogement,
  ETATS_SINISTRE,
  isEtatSinistre,
} from "@/shared/domain/value-objects/rga-simulation.enum";
export type { ZoneExposition, TypeLogement, EtatSinistre } from "@/shared/domain/value-objects/rga-simulation.enum";

/**
 * Ancienneté minimale de construction (en années)
 */
export const ANCIENNETE_MINIMALE_CONSTRUCTION = 15;

/**
 * Nombre maximum de niveaux autorisés
 */
export const NIVEAUX_MAXIMUM = 3;

/**
 * Montant maximum d'indemnisation passée pour rester éligible
 */
export const MONTANT_INDEMNISATION_MAXIMUM = 10000;
