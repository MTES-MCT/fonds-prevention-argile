/**
 * Données RGA stockées en JSONB dans la base de données
 */
export interface RGASimulationData {
  logement: {
    adresse: string;
    code_region: string;
    code_departement: string;
    epci: string;
    commune: string; // Code INSEE
    commune_nom: string;
    coordonnees: string;
    clef_ban: string;
    commune_denormandie: boolean;
    annee_de_construction: string;
    rnb: string;
    niveaux: number;
    zone_dexposition: "faible" | "moyen" | "fort";
    type: "maison" | "appartement";
    mitoyen: boolean;
    proprietaire_occupant: boolean;
  };

  taxeFonciere: {
    commune_eligible: boolean;
  };

  rga: {
    assure: boolean;
    indemnise_indemnise_rga: boolean;
    sinistres: "saine" | "très peu endommagée" | "endommagée";
    indemnise_montant_indemnite: number;
  };

  menage: {
    revenu_rga: number;
    personnes: number;
  };

  vous: {
    proprietaire_condition?: boolean;
    proprietaire_occupant_rga?: boolean;
  };

  simulatedAt: string; // ISO date
}

/**
 * Type pour les données RGA partielles (formulaire en cours)
 */
export type PartialRGASimulationData = {
  logement?: Partial<RGASimulationData["logement"]>;
  taxeFonciere?: Partial<RGASimulationData["taxeFonciere"]>;
  rga?: Partial<RGASimulationData["rga"]>;
  menage?: Partial<RGASimulationData["menage"]>;
  vous?: Partial<RGASimulationData["vous"]>;
  simulatedAt?: string;
};

/**
 * Raison de suppression des données RGA (RGPD)
 */
export enum RGADeletionReason {
  SENT_TO_DS = "sent_to_ds",
  EXPIRED = "expired",
  MANUAL = "manual",
  USER_REQUEST = "user_request",
}
