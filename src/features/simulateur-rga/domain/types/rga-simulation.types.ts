/**
 * Données RGA stockées en JSONB dans la base de données
 * Structure identique à RGAFormData mais nettoyée/normalisée
 */
export interface RGASimulationData {
  // Logement
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

  // Taxe foncière
  taxeFonciere: {
    commune_eligible: boolean;
  };

  // RGA
  rga: {
    assure: boolean;
    indemnise_indemnise_rga: boolean;
    sinistres: "saine" | "très peu endommagée" | "endommagée";
    indemnise_montant_indemnite: number;
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

  // Timestamp de simulation
  simulatedAt: string; // ISO date
}

/**
 * Raison de suppression des données RGA (RGPD)
 */
export enum RGADeletionReason {
  SENT_TO_DS = "sent_to_ds", // Envoyé à Démarches Simplifiées
  EXPIRED = "expired", // Expiration après X jours
  MANUAL = "manual", // Suppression manuelle par admin
  USER_REQUEST = "user_request", // Demande de l'utilisateur (droit à l'oubli)
}
