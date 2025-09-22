export interface RGAFormData {
  // Logement
  logement: {
    adresse: string;
    codeRegion: string;
    codeDepartement: string;
    epci: string;
    commune: string;
    communeNom: string;
    coordonnees: string;
    clefBan: string;
    communeDenormandie: "oui" | "non";
    anneeConstruction: string;
    rnb: string;
    niveaux: number;
    zoneExposition: "faible" | "moyen" | "fort";
    type: "maison" | "appartement";
    mitoyen: "oui" | "non";
    proprietaireOccupant: "oui" | "non";
  };

  // Taxe foncière
  taxeFonciere: {
    communeEligible: "oui" | "non";
  };

  // RGA
  rga: {
    assure: "oui" | "non";
    indemniseRGA: "oui" | "non";
    peuEndommage: "oui" | "non";
  };

  // Ménage
  menage: {
    revenu: number;
    personnes: number;
  };

  // Propriétaire
  vous: {
    proprietaireStatut: "proprietaire" | "locataire" | "autre";
  };
}

export type RGAFormDataParsed = Partial<RGAFormData>;
