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
