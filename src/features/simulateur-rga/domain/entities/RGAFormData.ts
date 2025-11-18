// Constantes pour les valeurs possibles
const ZONES_EXPOSITION = ["faible", "moyen", "fort"] as const;
const TYPES_LOGEMENT = ["maison", "appartement"] as const;
const ETATS_SINISTRE = ["saine", "très peu endommagée", "endommagée"] as const;

// Types dérivés des constantes
export type ZoneExposition = (typeof ZONES_EXPOSITION)[number];
export type TypeLogement = (typeof TYPES_LOGEMENT)[number];
export type EtatSinistre = (typeof ETATS_SINISTRE)[number];

// Type guards
export const isZoneExposition = (value: unknown): value is ZoneExposition => {
  return (
    typeof value === "string" &&
    ZONES_EXPOSITION.includes(value as ZoneExposition)
  );
};

export const isTypeLogement = (value: unknown): value is TypeLogement => {
  return (
    typeof value === "string" && TYPES_LOGEMENT.includes(value as TypeLogement)
  );
};

export const isEtatSinistre = (value: unknown): value is EtatSinistre => {
  return (
    typeof value === "string" && ETATS_SINISTRE.includes(value as EtatSinistre)
  );
};

/**
 * Entité représentant les données du simulateur RGA
 * Reçues depuis l'iframe MesAidesRénov
 */
export interface RGAFormData {
  // Logement
  logement: {
    adresse: string;
    code_region: string;
    code_departement: string;
    epci: string;
    commune: string;
    commune_nom: string;
    coordonnees: string;
    clef_ban: string;
    commune_denormandie: boolean;
    annee_de_construction: string;
    rnb: string;
    niveaux: number;
    zone_dexposition: ZoneExposition;
    type: TypeLogement;
    mitoyen: boolean;
    proprietaire_occupant: boolean;
  };

  // Taxe foncière
  taxeFonciere: {
    commune_eligible: boolean;
  };

  // RGA
  rga: {
    assure: boolean;
    indemnise_indemnise_rga: boolean;
    sinistres: EtatSinistre;
  };

  // Ménage
  menage: {
    revenu_rga: number;
    personnes: number;
  };

  // Propriétaire
  vous: {
    proprietaire_condition?: boolean;
    proprietaire_occupant_rga?: boolean;
  };
}

/**
 * Type pour les données RGA partielles (récursif)
 */
export type PartialRGAFormData = {
  logement?: Partial<RGAFormData["logement"]>;
  taxeFonciere?: Partial<RGAFormData["taxeFonciere"]>;
  rga?: Partial<RGAFormData["rga"]>;
  menage?: Partial<RGAFormData["menage"]>;
  vous?: Partial<RGAFormData["vous"]>;
};
