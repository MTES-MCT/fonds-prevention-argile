import { describe, it, expect } from "vitest";
import { parseRGAParams } from "./parser.service";

describe("parseRGAParams", () => {
  describe("Parse des sections", () => {
    it("devrait parser les données de la section logement", () => {
      const params = new URLSearchParams({
        "logement.adresse": "10 rue de la Paix",
        "logement.type": "maison",
        "logement.niveaux": "2",
      });

      const result = parseRGAParams(params);

      expect(result.logement).toBeDefined();
      expect(result.logement?.adresse).toBe("10 rue de la Paix");
      expect(result.logement?.type).toBe("maison");
      expect(result.logement?.niveaux).toBe(2);
    });

    it("devrait parser les données de la section menage", () => {
      const params = new URLSearchParams({
        "menage.revenu_rga": "25000",
        "menage.personnes": "4",
      });

      const result = parseRGAParams(params);

      expect(result.menage).toBeDefined();
      expect(result.menage?.revenu_rga).toBe(25000);
      expect(result.menage?.personnes).toBe(4);
    });

    it("devrait parser les données de la section rga", () => {
      const params = new URLSearchParams({
        "rga.assure": "oui",
        "rga.indemnise_rga": "non",
      });

      const result = parseRGAParams(params);

      expect(result.rga).toBeDefined();
      expect(result.rga?.assure).toBe(true);
      expect(result.rga?.indemnise_rga).toBe(false);
    });

    it("devrait parser les données de la section taxe_fonciere", () => {
      const params = new URLSearchParams({
        "taxe_fonciere.commune_eligible": "oui",
      });

      const result = parseRGAParams(params);

      expect(result.taxeFonciere).toBeDefined();
      expect(result.taxeFonciere?.commune_eligible).toBe(true);
    });

    it("devrait parser les données de la section vous", () => {
      const params = new URLSearchParams({
        "vous.proprietaire_condition": "oui",
      });

      const result = parseRGAParams(params);

      expect(result.vous).toBeDefined();
      expect(result.vous?.proprietaire_condition).toBe(true);
    });

    it("devrait parser plusieurs sections en même temps", () => {
      const params = new URLSearchParams({
        "logement.adresse": "10 rue de la Paix",
        "menage.personnes": "3",
        "rga.assure": "oui",
      });

      const result = parseRGAParams(params);

      expect(result.logement?.adresse).toBe("10 rue de la Paix");
      expect(result.menage?.personnes).toBe(3);
      expect(result.rga?.assure).toBe(true);
    });
  });

  describe("Conversion des valeurs", () => {
    it("devrait convertir 'oui' en true", () => {
      const params = new URLSearchParams({
        "rga.assure": "oui",
      });

      const result = parseRGAParams(params);

      expect(result.rga?.assure).toBe(true);
    });

    it("devrait convertir 'non' en false", () => {
      const params = new URLSearchParams({
        "rga.assure": "non",
      });

      const result = parseRGAParams(params);

      expect(result.rga?.assure).toBe(false);
    });

    it("devrait convertir les nombres en type number", () => {
      const params = new URLSearchParams({
        "menage.personnes": "5",
        "menage.revenu_rga": "30000",
      });

      const result = parseRGAParams(params);

      expect(result.menage?.personnes).toBe(5);
      expect(typeof result.menage?.personnes).toBe("number");
      expect(result.menage?.revenu_rga).toBe(30000);
      expect(typeof result.menage?.revenu_rga).toBe("number");
    });

    it("devrait garder les chaînes de caractères comme string", () => {
      const params = new URLSearchParams({
        "logement.type": "appartement",
        "logement.adresse": "10 rue de Paris",
      });

      const result = parseRGAParams(params);

      expect(result.logement?.type).toBe("appartement");
      expect(typeof result.logement?.type).toBe("string");
      expect(result.logement?.adresse).toBe("10 rue de Paris");
      expect(typeof result.logement?.adresse).toBe("string");
    });

    it("devrait convertir '0' en nombre 0", () => {
      const params = new URLSearchParams({
        "menage.personnes": "0",
      });

      const result = parseRGAParams(params);

      expect(result.menage?.personnes).toBe(0);
      expect(typeof result.menage?.personnes).toBe("number");
    });
  });

  describe("Nettoyage des clés", () => {
    it("devrait remplacer les espaces par des underscores", () => {
      const params = new URLSearchParams({
        "logement.code departement": "75",
      });

      const result = parseRGAParams(params);

      expect(result.logement?.code_departement).toBe(75);
    });

    it("devrait supprimer les accents", () => {
      const params = new URLSearchParams({
        "logement.année_de_construction": "2000",
      });

      const result = parseRGAParams(params);

      expect(result.logement?.annee_de_construction).toBe(2000);
    });

    it("devrait mettre les clés en minuscules", () => {
      const params = new URLSearchParams({
        "Logement.Adresse": "Paris",
        "MENAGE.PERSONNES": "3",
      });

      const result = parseRGAParams(params);

      expect(result.logement?.adresse).toBe("Paris");
      expect(result.menage?.personnes).toBe(3);
    });
  });

  describe("Nettoyage des valeurs", () => {
    it("devrait décoder les valeurs URL-encodées", () => {
      const params = new URLSearchParams({
        "logement.adresse": "10%20rue%20de%20la%20Paix",
      });

      const result = parseRGAParams(params);

      expect(result.logement?.adresse).toBe("10 rue de la Paix");
    });

    it("devrait supprimer les guillemets simples au début et fin", () => {
      const params = new URLSearchParams({
        "logement.type": "'maison'",
      });

      const result = parseRGAParams(params);

      expect(result.logement?.type).toBe("maison");
    });

    it("devrait supprimer les guillemets doubles au début et fin", () => {
      const params = new URLSearchParams({
        "logement.type": '"appartement"',
      });

      const result = parseRGAParams(params);

      expect(result.logement?.type).toBe("appartement");
    });

    it("devrait supprimer les astérisques à la fin", () => {
      const params = new URLSearchParams({
        "logement.type": "maison*",
      });

      const result = parseRGAParams(params);

      expect(result.logement?.type).toBe("maison");
    });

    it("devrait trim les espaces", () => {
      const params = new URLSearchParams({
        "logement.type": "  maison  ",
      });

      const result = parseRGAParams(params);

      expect(result.logement?.type).toBe("maison");
    });
  });

  describe("Cas edge", () => {
    it("devrait retourner un objet vide pour des paramètres vides", () => {
      const params = new URLSearchParams();

      const result = parseRGAParams(params);

      expect(result).toEqual({});
    });

    it("devrait ignorer les clés sans point (sans section)", () => {
      const params = new URLSearchParams({
        "logement.adresse": "Paris",
        invalide: "valeur",
      });

      const result = parseRGAParams(params);

      expect(result.logement?.adresse).toBe("Paris");
      expect(Object.keys(result).length).toBe(1);
    });

    it("devrait gérer une valeur vide", () => {
      const params = new URLSearchParams({
        "logement.adresse": "",
      });

      const result = parseRGAParams(params);

      expect(result.logement?.adresse).toBe("");
    });

    it("devrait gérer des nombres décimaux", () => {
      const params = new URLSearchParams({
        "menage.revenu_rga": "25000.50",
      });

      const result = parseRGAParams(params);

      expect(result.menage?.revenu_rga).toBe(25000.5);
      expect(typeof result.menage?.revenu_rga).toBe("number");
    });

    it("devrait gérer des nombres négatifs", () => {
      const params = new URLSearchParams({
        "menage.revenu_rga": "-1000",
      });

      const result = parseRGAParams(params);

      expect(result.menage?.revenu_rga).toBe(-1000);
      expect(typeof result.menage?.revenu_rga).toBe("number");
    });

    it("devrait gérer plusieurs paramètres avec la même section", () => {
      const params = new URLSearchParams({
        "logement.adresse": "Paris",
        "logement.type": "maison",
        "logement.niveaux": "2",
      });

      const result = parseRGAParams(params);

      expect(result.logement?.adresse).toBe("Paris");
      expect(result.logement?.type).toBe("maison");
      expect(result.logement?.niveaux).toBe(2);
    });
  });
});
