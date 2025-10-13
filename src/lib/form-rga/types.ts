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
    indemnise_rga: "oui" | "non";
    peu_endommage: "saine" | "peu-endommagee" | "endommagee";
  };

  // Ménage
  menage: {
    revenu: number;
    personnes: number;
  };

  // Propriétaire
  vous: {
    proprietaire_condition?: "oui" | "non";
    proprietaire_occupant_rga?: "oui" | "non";
  };
}

export type RGAFormDataParsed = Partial<RGAFormData>;
