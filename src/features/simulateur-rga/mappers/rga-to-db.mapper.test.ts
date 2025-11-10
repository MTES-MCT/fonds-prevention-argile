import { describe, it, expect } from "vitest";
import {
  mapRGAFormDataToDBSchema,
  validateRGADataForMapping,
} from "./rga-to-db.mapper";
import type { RGAFormData } from "../domain/entities";

describe("rga-to-db.mapper", () => {
  const mockRGAFormData: RGAFormData = {
    logement: {
      adresse: "123 Rue de la Paix, 75001 Paris",
      code_region: "11",
      code_departement: "75",
      epci: "200054781",
      commune: "75101",
      commune_nom: "Paris 1er Arrondissement",
      coordonnees: "48.8566,2.3522",
      clef_ban: "75101_1234_00001",
      commune_denormandie: "non",
      annee_de_construction: "1990",
      rnb: "RNB123456",
      niveaux: 2,
      zone_dexposition: "moyen",
      type: "maison",
      mitoyen: "oui",
      proprietaire_occupant: "oui",
    },
    taxeFonciere: {
      commune_eligible: "oui",
    },
    rga: {
      assure: "oui",
      indemnise_indemnise_rga: "non",
      sinistres: "saine",
    },
    menage: {
      revenu_rga: 35000,
      personnes: 4,
    },
    vous: {
      proprietaire_condition: "oui",
      proprietaire_occupant_rga: "oui",
    },
  };

  describe("mapRGAFormDataToDBSchema", () => {
    it("devrait mapper correctement toutes les données", () => {
      const result = mapRGAFormDataToDBSchema(mockRGAFormData);

      // Vérifier structure complète
      expect(result).toHaveProperty("logement");
      expect(result).toHaveProperty("taxeFonciere");
      expect(result).toHaveProperty("rga");
      expect(result).toHaveProperty("menage");
      expect(result).toHaveProperty("vous");
      expect(result).toHaveProperty("simulatedAt");
    });

    it("devrait convertir 'oui'/'non' en boolean", () => {
      const result = mapRGAFormDataToDBSchema(mockRGAFormData);

      expect(result.logement.mitoyen).toBe(true);
      expect(result.logement.proprietaire_occupant).toBe(true);
      expect(result.logement.commune_denormandie).toBe(false);
      expect(result.rga.assure).toBe(true);
      expect(result.rga.indemnise_indemnise_rga).toBe(false);
      expect(result.taxeFonciere.commune_eligible).toBe(true);
    });

    it("devrait préserver les valeurs numériques", () => {
      const result = mapRGAFormDataToDBSchema(mockRGAFormData);

      expect(result.menage.revenu_rga).toBe(35000);
      expect(result.menage.personnes).toBe(4);
      expect(result.logement.niveaux).toBe(2);
    });

    it("devrait ajouter un timestamp", () => {
      const result = mapRGAFormDataToDBSchema(mockRGAFormData);

      expect(result.simulatedAt).toBeDefined();
      expect(new Date(result.simulatedAt).toString()).not.toBe("Invalid Date");
    });
  });

  describe("validateRGADataForMapping", () => {
    it("devrait valider des données complètes", () => {
      const result = validateRGADataForMapping(mockRGAFormData);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("devrait détecter un code INSEE manquant", () => {
      const invalidData = {
        ...mockRGAFormData,
        logement: { ...mockRGAFormData.logement, commune: "" },
      };

      const result = validateRGADataForMapping(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Code INSEE manquant");
    });

    it("devrait détecter plusieurs erreurs", () => {
      const invalidData = {
        ...mockRGAFormData,
        logement: {
          ...mockRGAFormData.logement,
          commune: "",
          adresse: "",
          zone_dexposition: "" as any,
        },
        menage: {
          ...mockRGAFormData.menage,
          revenu_rga: undefined as any,
        },
      };

      const result = validateRGADataForMapping(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(2);
    });
  });
});
