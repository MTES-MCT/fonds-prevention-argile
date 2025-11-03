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
    commune_denormandie: "oui" | "non";
    annee_de_construction: string;
    rnb: string;
    niveaux: number;
    zone_dexposition: "faible" | "moyen" | "fort";
    type: "maison" | "appartement";
    mitoyen: "oui" | "non";
    proprietaire_occupant: "oui" | "non";
  };

  // Taxe foncière
  taxeFonciere: {
    commune_eligible: "oui" | "non";
  };

  // RGA
  rga: {
    assure: "oui" | "non";
    indemnise_indemnise_rga: "oui" | "non";
    sinistres: "saine" | "très peu endommagée" | "endommagée";
  };

  // Ménage
  menage: {
    revenu_rga: number;
    personnes: number;
  };

  // Propriétaire
  vous: {
    proprietaire_condition?: "oui" | "non";
    proprietaire_occupant_rga?: "oui" | "non";
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
