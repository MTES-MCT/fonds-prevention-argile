import { describe, it, expect } from "vitest";
import { validateRGAData } from "./validator.service";
import { PartialRGAFormData } from "../domain/entities";

describe("validateRGAData", () => {
  describe("Données valides", () => {
    it("devrait retourner un tableau vide pour des données complètes et valides", () => {
      const data: PartialRGAFormData = {
        logement: {
          adresse: "10 rue de la Paix, 75001 Paris",
          type: "maison",
          code_region: "11",
          code_departement: "75",
          epci: "200054781",
          commune: "75101",
          commune_nom: "Paris",
          coordonnees: "48.8566,2.3522",
          clef_ban: "75101_1234_00001",
          commune_denormandie: "non",
          annee_de_construction: "2000",
          rnb: "RNB123",
          niveaux: 2,
          zone_dexposition: "moyen",
          mitoyen: "non",
          proprietaire_occupant: "oui",
        },
        menage: {
          revenu_rga: 30000,
          personnes: 4,
        },
      };

      const errors = validateRGAData(data);

      expect(errors).toEqual([]);
      expect(errors.length).toBe(0);
    });

    it("devrait accepter un revenu positif", () => {
      const data: PartialRGAFormData = {
        logement: {
          adresse: "10 rue de la Paix",
          type: "appartement",
          code_region: "11",
          code_departement: "75",
          epci: "200054781",
          commune: "75101",
          commune_nom: "Paris",
          coordonnees: "48.8566,2.3522",
          clef_ban: "75101_1234_00001",
          commune_denormandie: "non",
          annee_de_construction: "2000",
          rnb: "RNB123",
          niveaux: 1,
          zone_dexposition: "faible",
          mitoyen: "oui",
          proprietaire_occupant: "oui",
        },
        menage: {
          revenu_rga: 1,
          personnes: 1,
        },
      };

      const errors = validateRGAData(data);

      expect(errors).toEqual([]);
    });

    it("devrait accepter un nombre de personnes de 1", () => {
      const data: PartialRGAFormData = {
        logement: {
          adresse: "10 rue de la Paix",
          type: "maison",
          code_region: "11",
          code_departement: "75",
          epci: "200054781",
          commune: "75101",
          commune_nom: "Paris",
          coordonnees: "48.8566,2.3522",
          clef_ban: "75101_1234_00001",
          commune_denormandie: "non",
          annee_de_construction: "2000",
          rnb: "RNB123",
          niveaux: 2,
          zone_dexposition: "moyen",
          mitoyen: "non",
          proprietaire_occupant: "oui",
        },
        menage: {
          revenu_rga: 25000,
          personnes: 1,
        },
      };

      const errors = validateRGAData(data);

      expect(errors).toEqual([]);
    });
  });

  describe("Adresse du logement", () => {
    it("devrait retourner une erreur si l'adresse est manquante", () => {
      const data: PartialRGAFormData = {
        logement: {
          type: "maison",
          code_region: "11",
          code_departement: "75",
          epci: "200054781",
          commune: "75101",
          commune_nom: "Paris",
          coordonnees: "48.8566,2.3522",
          clef_ban: "75101_1234_00001",
          commune_denormandie: "non",
          annee_de_construction: "2000",
          rnb: "RNB123",
          niveaux: 2,
          zone_dexposition: "moyen",
          mitoyen: "non",
          proprietaire_occupant: "oui",
        },
        menage: {
          revenu_rga: 30000,
          personnes: 4,
        },
      };

      const errors = validateRGAData(data);

      expect(errors).toContain("Adresse du logement manquante");
      expect(errors.length).toBe(1);
    });

    it("devrait retourner une erreur si la section logement est absente", () => {
      const data: PartialRGAFormData = {
        menage: {
          revenu_rga: 30000,
          personnes: 4,
        },
      };

      const errors = validateRGAData(data);

      expect(errors).toContain("Adresse du logement manquante");
    });

    it("devrait retourner une erreur si l'adresse est une chaîne vide", () => {
      const data: PartialRGAFormData = {
        logement: {
          adresse: "",
          type: "maison",
          code_region: "11",
          code_departement: "75",
          epci: "200054781",
          commune: "75101",
          commune_nom: "Paris",
          coordonnees: "48.8566,2.3522",
          clef_ban: "75101_1234_00001",
          commune_denormandie: "non",
          annee_de_construction: "2000",
          rnb: "RNB123",
          niveaux: 2,
          zone_dexposition: "moyen",
          mitoyen: "non",
          proprietaire_occupant: "oui",
        },
        menage: {
          revenu_rga: 30000,
          personnes: 4,
        },
      };

      const errors = validateRGAData(data);

      expect(errors).toContain("Adresse du logement manquante");
    });
  });

  describe("Type de logement", () => {
    it("devrait retourner une erreur si le type est manquant", () => {
      const data: PartialRGAFormData = {
        logement: {
          adresse: "10 rue de la Paix",
          code_region: "11",
          code_departement: "75",
          epci: "200054781",
          commune: "75101",
          commune_nom: "Paris",
          coordonnees: "48.8566,2.3522",
          clef_ban: "75101_1234_00001",
          commune_denormandie: "non",
          annee_de_construction: "2000",
          rnb: "RNB123",
          niveaux: 2,
          zone_dexposition: "moyen",
          mitoyen: "non",
          proprietaire_occupant: "oui",
        },
        menage: {
          revenu_rga: 30000,
          personnes: 4,
        },
      };

      const errors = validateRGAData(data);

      expect(errors).toContain("Type de logement manquant");
      expect(errors.length).toBe(1);
    });

    it("devrait retourner une erreur si le type est une chaîne vide", () => {
      const data: PartialRGAFormData = {
        logement: {
          adresse: "10 rue de la Paix",
          type: "" as "maison",
          code_region: "11",
          code_departement: "75",
          epci: "200054781",
          commune: "75101",
          commune_nom: "Paris",
          coordonnees: "48.8566,2.3522",
          clef_ban: "75101_1234_00001",
          commune_denormandie: "non",
          annee_de_construction: "2000",
          rnb: "RNB123",
          niveaux: 2,
          zone_dexposition: "moyen",
          mitoyen: "non",
          proprietaire_occupant: "oui",
        },
        menage: {
          revenu_rga: 30000,
          personnes: 4,
        },
      };

      const errors = validateRGAData(data);

      expect(errors).toContain("Type de logement manquant");
    });
  });

  describe("Revenu du ménage", () => {
    it("devrait retourner une erreur si le revenu est manquant", () => {
      const data: PartialRGAFormData = {
        logement: {
          adresse: "10 rue de la Paix",
          type: "maison",
          code_region: "11",
          code_departement: "75",
          epci: "200054781",
          commune: "75101",
          commune_nom: "Paris",
          coordonnees: "48.8566,2.3522",
          clef_ban: "75101_1234_00001",
          commune_denormandie: "non",
          annee_de_construction: "2000",
          rnb: "RNB123",
          niveaux: 2,
          zone_dexposition: "moyen",
          mitoyen: "non",
          proprietaire_occupant: "oui",
        },
        menage: {
          personnes: 4,
        },
      };

      const errors = validateRGAData(data);

      expect(errors).toContain("Revenu du ménage invalide");
    });

    it("devrait retourner une erreur si le revenu est égal à 0", () => {
      const data: PartialRGAFormData = {
        logement: {
          adresse: "10 rue de la Paix",
          type: "maison",
          code_region: "11",
          code_departement: "75",
          epci: "200054781",
          commune: "75101",
          commune_nom: "Paris",
          coordonnees: "48.8566,2.3522",
          clef_ban: "75101_1234_00001",
          commune_denormandie: "non",
          annee_de_construction: "2000",
          rnb: "RNB123",
          niveaux: 2,
          zone_dexposition: "moyen",
          mitoyen: "non",
          proprietaire_occupant: "oui",
        },
        menage: {
          revenu_rga: 0,
          personnes: 4,
        },
      };

      const errors = validateRGAData(data);

      expect(errors).toContain("Revenu du ménage invalide");
    });

    it("devrait retourner une erreur si le revenu est négatif", () => {
      const data: PartialRGAFormData = {
        logement: {
          adresse: "10 rue de la Paix",
          type: "maison",
          code_region: "11",
          code_departement: "75",
          epci: "200054781",
          commune: "75101",
          commune_nom: "Paris",
          coordonnees: "48.8566,2.3522",
          clef_ban: "75101_1234_00001",
          commune_denormandie: "non",
          annee_de_construction: "2000",
          rnb: "RNB123",
          niveaux: 2,
          zone_dexposition: "moyen",
          mitoyen: "non",
          proprietaire_occupant: "oui",
        },
        menage: {
          revenu_rga: -1000,
          personnes: 4,
        },
      };

      const errors = validateRGAData(data);

      expect(errors).toContain("Revenu du ménage invalide");
    });

    it("devrait retourner une erreur si la section menage est absente", () => {
      const data: PartialRGAFormData = {
        logement: {
          adresse: "10 rue de la Paix",
          type: "maison",
          code_region: "11",
          code_departement: "75",
          epci: "200054781",
          commune: "75101",
          commune_nom: "Paris",
          coordonnees: "48.8566,2.3522",
          clef_ban: "75101_1234_00001",
          commune_denormandie: "non",
          annee_de_construction: "2000",
          rnb: "RNB123",
          niveaux: 2,
          zone_dexposition: "moyen",
          mitoyen: "non",
          proprietaire_occupant: "oui",
        },
      };

      const errors = validateRGAData(data);

      expect(errors).toContain("Revenu du ménage invalide");
      expect(errors).toContain("Nombre de personnes invalide");
    });
  });

  describe("Nombre de personnes", () => {
    it("devrait retourner une erreur si le nombre de personnes est manquant", () => {
      const data: PartialRGAFormData = {
        logement: {
          adresse: "10 rue de la Paix",
          type: "maison",
          code_region: "11",
          code_departement: "75",
          epci: "200054781",
          commune: "75101",
          commune_nom: "Paris",
          coordonnees: "48.8566,2.3522",
          clef_ban: "75101_1234_00001",
          commune_denormandie: "non",
          annee_de_construction: "2000",
          rnb: "RNB123",
          niveaux: 2,
          zone_dexposition: "moyen",
          mitoyen: "non",
          proprietaire_occupant: "oui",
        },
        menage: {
          revenu_rga: 30000,
        },
      };

      const errors = validateRGAData(data);

      expect(errors).toContain("Nombre de personnes invalide");
    });

    it("devrait retourner une erreur si le nombre de personnes est égal à 0", () => {
      const data: PartialRGAFormData = {
        logement: {
          adresse: "10 rue de la Paix",
          type: "maison",
          code_region: "11",
          code_departement: "75",
          epci: "200054781",
          commune: "75101",
          commune_nom: "Paris",
          coordonnees: "48.8566,2.3522",
          clef_ban: "75101_1234_00001",
          commune_denormandie: "non",
          annee_de_construction: "2000",
          rnb: "RNB123",
          niveaux: 2,
          zone_dexposition: "moyen",
          mitoyen: "non",
          proprietaire_occupant: "oui",
        },
        menage: {
          revenu_rga: 30000,
          personnes: 0,
        },
      };

      const errors = validateRGAData(data);

      expect(errors).toContain("Nombre de personnes invalide");
    });

    it("devrait retourner une erreur si le nombre de personnes est négatif", () => {
      const data: PartialRGAFormData = {
        logement: {
          adresse: "10 rue de la Paix",
          type: "maison",
          code_region: "11",
          code_departement: "75",
          epci: "200054781",
          commune: "75101",
          commune_nom: "Paris",
          coordonnees: "48.8566,2.3522",
          clef_ban: "75101_1234_00001",
          commune_denormandie: "non",
          annee_de_construction: "2000",
          rnb: "RNB123",
          niveaux: 2,
          zone_dexposition: "moyen",
          mitoyen: "non",
          proprietaire_occupant: "oui",
        },
        menage: {
          revenu_rga: 30000,
          personnes: -2,
        },
      };

      const errors = validateRGAData(data);

      expect(errors).toContain("Nombre de personnes invalide");
    });
  });

  describe("Combinaisons d'erreurs", () => {
    it("devrait retourner plusieurs erreurs si plusieurs champs sont invalides", () => {
      const data: PartialRGAFormData = {
        logement: {
          code_region: "11",
          code_departement: "75",
          epci: "200054781",
          commune: "75101",
          commune_nom: "Paris",
          coordonnees: "48.8566,2.3522",
          clef_ban: "75101_1234_00001",
          commune_denormandie: "non",
          annee_de_construction: "2000",
          rnb: "RNB123",
          niveaux: 2,
          zone_dexposition: "moyen",
          mitoyen: "non",
          proprietaire_occupant: "oui",
        },
        menage: {
          revenu_rga: 0,
          personnes: 0,
        },
      };

      const errors = validateRGAData(data);

      expect(errors).toContain("Adresse du logement manquante");
      expect(errors).toContain("Revenu du ménage invalide");
      expect(errors).toContain("Nombre de personnes invalide");
      expect(errors).toContain("Type de logement manquant");
      expect(errors.length).toBe(4);
    });

    it("devrait retourner toutes les erreurs possibles si toutes les données sont manquantes", () => {
      const data: PartialRGAFormData = {};

      const errors = validateRGAData(data);

      expect(errors).toContain("Adresse du logement manquante");
      expect(errors).toContain("Revenu du ménage invalide");
      expect(errors).toContain("Nombre de personnes invalide");
      expect(errors).toContain("Type de logement manquant");
      expect(errors.length).toBe(4);
    });

    it("devrait retourner 3 erreurs si seule l'adresse est présente", () => {
      const data: PartialRGAFormData = {
        logement: {
          adresse: "10 rue de la Paix",
          code_region: "11",
          code_departement: "75",
          epci: "200054781",
          commune: "75101",
          commune_nom: "Paris",
          coordonnees: "48.8566,2.3522",
          clef_ban: "75101_1234_00001",
          commune_denormandie: "non",
          annee_de_construction: "2000",
          rnb: "RNB123",
          niveaux: 2,
          zone_dexposition: "moyen",
          mitoyen: "non",
          proprietaire_occupant: "oui",
        },
      };

      const errors = validateRGAData(data);

      expect(errors).not.toContain("Adresse du logement manquante");
      expect(errors).toContain("Revenu du ménage invalide");
      expect(errors).toContain("Nombre de personnes invalide");
      expect(errors).toContain("Type de logement manquant");
      expect(errors.length).toBe(3);
    });
  });
});
