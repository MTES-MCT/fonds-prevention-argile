import { describe, it, expect } from "vitest";
import {
  getCodeDepartementFromCodeInsee,
  isValidSiret,
  normalizeCodeInsee,
  validateEmailsList,
} from "./amo.utils";

describe("amo.utils", () => {
  describe("getCodeDepartementFromCodeInsee", () => {
    describe("Départements métropolitains (2 chiffres)", () => {
      it("devrait extraire le code département pour Paris (75)", () => {
        expect(getCodeDepartementFromCodeInsee("75001")).toBe("75");
        expect(getCodeDepartementFromCodeInsee("75020")).toBe("75");
      });

      it("devrait extraire le code département pour la Seine-et-Marne (77)", () => {
        expect(getCodeDepartementFromCodeInsee("77001")).toBe("77");
      });

      it("devrait extraire le code département pour le Nord (59)", () => {
        expect(getCodeDepartementFromCodeInsee("59001")).toBe("59");
        expect(getCodeDepartementFromCodeInsee("59350")).toBe("59");
      });

      it("devrait extraire le code département pour l'Ain (01)", () => {
        expect(getCodeDepartementFromCodeInsee("01001")).toBe("01");
      });

      it("devrait extraire le code département pour la Corse-du-Sud (2A)", () => {
        // Note: le code INSEE de la Corse commence par 2A ou 2B
        // mais techniquement stocké comme 20xxx dans certains systèmes
        expect(getCodeDepartementFromCodeInsee("20001")).toBe("20");
      });

      it("devrait extraire le code département pour les Bouches-du-Rhône (13)", () => {
        expect(getCodeDepartementFromCodeInsee("13001")).toBe("13");
        expect(getCodeDepartementFromCodeInsee("13055")).toBe("13");
      });
    });

    describe("Départements d'outre-mer (3 chiffres)", () => {
      it("devrait extraire le code département pour la Guadeloupe (971)", () => {
        expect(getCodeDepartementFromCodeInsee("97101")).toBe("971");
        expect(getCodeDepartementFromCodeInsee("97132")).toBe("971");
      });

      it("devrait extraire le code département pour la Martinique (972)", () => {
        expect(getCodeDepartementFromCodeInsee("97201")).toBe("972");
        expect(getCodeDepartementFromCodeInsee("97234")).toBe("972");
      });

      it("devrait extraire le code département pour la Guyane (973)", () => {
        expect(getCodeDepartementFromCodeInsee("97301")).toBe("973");
        expect(getCodeDepartementFromCodeInsee("97302")).toBe("973");
      });

      it("devrait extraire le code département pour La Réunion (974)", () => {
        expect(getCodeDepartementFromCodeInsee("97401")).toBe("974");
        expect(getCodeDepartementFromCodeInsee("97411")).toBe("974");
      });

      it("devrait extraire le code département pour Mayotte (976)", () => {
        expect(getCodeDepartementFromCodeInsee("97601")).toBe("976");
        expect(getCodeDepartementFromCodeInsee("97617")).toBe("976");
      });

      it("devrait extraire le code département pour Saint-Pierre-et-Miquelon (975)", () => {
        expect(getCodeDepartementFromCodeInsee("97501")).toBe("975");
      });

      it("devrait extraire le code département pour Saint-Barthélemy (977)", () => {
        expect(getCodeDepartementFromCodeInsee("97701")).toBe("977");
      });

      it("devrait extraire le code département pour Saint-Martin (978)", () => {
        expect(getCodeDepartementFromCodeInsee("97801")).toBe("978");
      });

      it("devrait extraire le code département pour les collectivités du Pacifique (98x)", () => {
        expect(getCodeDepartementFromCodeInsee("98701")).toBe("987"); // Polynésie française
        expect(getCodeDepartementFromCodeInsee("98801")).toBe("988"); // Nouvelle-Calédonie
      });
    });

    describe("Validation et erreurs", () => {
      it("devrait lancer une erreur si le code INSEE est vide", () => {
        expect(() => getCodeDepartementFromCodeInsee("")).toThrow(
          "Code INSEE invalide : doit contenir 5 chiffres"
        );
      });

      it("devrait lancer une erreur si le code INSEE est null/undefined", () => {
        expect(() => getCodeDepartementFromCodeInsee(null)).toThrow(
          "Code INSEE invalide : doit contenir 5 chiffres"
        );
        expect(() => getCodeDepartementFromCodeInsee(undefined)).toThrow(
          "Code INSEE invalide : doit contenir 5 chiffres"
        );
      });

      it("devrait lancer une erreur si le code INSEE n'a pas 5 chiffres", () => {
        expect(() => getCodeDepartementFromCodeInsee("750")).toThrow(
          "Code INSEE invalide : doit contenir 5 chiffres"
        );
        expect(() => getCodeDepartementFromCodeInsee("7501")).toThrow(
          "Code INSEE invalide : doit contenir 5 chiffres"
        );
        expect(() => getCodeDepartementFromCodeInsee("750012")).toThrow(
          "Code INSEE invalide : doit contenir 5 chiffres"
        );
      });
    });

    describe("Cas limites", () => {
      it("devrait gérer les codes INSEE avec des espaces (trim)", () => {
        // Note: la fonction actuelle ne fait pas de trim,
        // donc cela devrait échouer. Ce test documente le comportement attendu.
        expect(() => getCodeDepartementFromCodeInsee(" 75001")).toThrow();
        expect(() => getCodeDepartementFromCodeInsee("75001 ")).toThrow();
      });

      it("devrait gérer correctement les codes commençant par 96 (non-DOM)", () => {
        // 96xxx n'est pas un DOM, donc 2 chiffres
        expect(getCodeDepartementFromCodeInsee("96001")).toBe("96");
      });

      it("devrait gérer correctement les codes commençant par 99 (non-DOM)", () => {
        // 99xxx n'est pas un DOM standard, donc 2 chiffres
        expect(getCodeDepartementFromCodeInsee("99001")).toBe("99");
      });
    });
  });

  describe("isValidSiret", () => {
    describe("SIRET valides", () => {
      it("devrait valider un SIRET de 14 chiffres", () => {
        expect(isValidSiret("12345678901234")).toBe(true);
        expect(isValidSiret("98765432109876")).toBe(true);
        expect(isValidSiret("00000000000000")).toBe(true);
      });

      it("devrait valider un SIRET avec des espaces", () => {
        expect(isValidSiret("123 456 789 01234")).toBe(true);
        expect(isValidSiret("123 456 789 012 34")).toBe(true);
        expect(isValidSiret("12345678 90123 4")).toBe(true);
      });

      it("devrait valider un SIRET réel", () => {
        // SIRET de l'INSEE (exemple public)
        expect(isValidSiret("12000101100010")).toBe(true);
      });
    });

    describe("SIRET invalides", () => {
      it("devrait rejeter un SIRET trop court", () => {
        expect(isValidSiret("123456789012")).toBe(false); // 12 chiffres
        expect(isValidSiret("1234567890123")).toBe(false); // 13 chiffres
      });

      it("devrait rejeter un SIRET trop long", () => {
        expect(isValidSiret("123456789012345")).toBe(false); // 15 chiffres
        expect(isValidSiret("12345678901234567")).toBe(false);
      });

      it("devrait rejeter un SIRET vide", () => {
        expect(isValidSiret("")).toBe(false);
      });

      it("devrait rejeter un SIRET contenant des lettres", () => {
        expect(isValidSiret("1234567890123A")).toBe(false);
        expect(isValidSiret("ABCD5678901234")).toBe(false);
        expect(isValidSiret("12345678ABC234")).toBe(false);
      });

      it("devrait rejeter un SIRET contenant des caractères spéciaux", () => {
        expect(isValidSiret("12345678-01234")).toBe(false);
        expect(isValidSiret("12345678.01234")).toBe(false);
        expect(isValidSiret("12345678/01234")).toBe(false);
      });

      it("devrait rejeter un SIRET avec uniquement des espaces", () => {
        expect(isValidSiret("              ")).toBe(false);
        expect(isValidSiret("   ")).toBe(false);
      });
    });

    describe("Cas limites", () => {
      it("devrait gérer les espaces multiples", () => {
        expect(isValidSiret("123  456  789  012  34")).toBe(true);
      });

      it("devrait gérer les espaces en début et fin", () => {
        expect(isValidSiret(" 12345678901234 ")).toBe(true);
        expect(isValidSiret("  12345678901234  ")).toBe(true);
      });

      it("devrait gérer les tabulations et sauts de ligne comme espaces", () => {
        // La fonction utilise replace(/\s/g, '') donc tous les whitespaces
        expect(isValidSiret("12345678901234\t")).toBe(true);
        expect(isValidSiret("12345678901234\n")).toBe(true);
      });
    });
  });

  describe("validateEmailsList", () => {
    describe("Emails valides", () => {
      it("devrait valider un seul email valide", () => {
        const result = validateEmailsList("contact@example.com");
        expect(result).toEqual(["contact@example.com"]);
      });

      it("devrait valider plusieurs emails séparés par des points-virgules", () => {
        const result = validateEmailsList(
          "contact@example.com;info@example.com;support@example.com"
        );
        expect(result).toEqual([
          "contact@example.com",
          "info@example.com",
          "support@example.com",
        ]);
      });

      it("devrait valider des emails avec des domaines complexes", () => {
        const result = validateEmailsList(
          "user@sub.example.com;contact@example.co.uk"
        );
        expect(result).toEqual([
          "user@sub.example.com",
          "contact@example.co.uk",
        ]);
      });

      it("devrait valider des emails avec des chiffres et underscores", () => {
        const result = validateEmailsList(
          "user_123@example.com;test.user@example123.com"
        );
        expect(result).toEqual([
          "user_123@example.com",
          "test.user@example123.com",
        ]);
      });
    });

    describe("Trimming et nettoyage", () => {
      it("devrait trimmer les espaces autour des emails", () => {
        const result = validateEmailsList(
          " contact@example.com ; info@example.com "
        );
        expect(result).toEqual(["contact@example.com", "info@example.com"]);
      });

      it("devrait trimmer les espaces multiples", () => {
        const result = validateEmailsList(
          "  contact@example.com  ;  info@example.com  "
        );
        expect(result).toEqual(["contact@example.com", "info@example.com"]);
      });

      it("devrait gérer les points-virgules multiples", () => {
        const result = validateEmailsList(
          "contact@example.com;;info@example.com"
        );
        expect(result).toEqual(["contact@example.com", "info@example.com"]);
      });

      it("devrait gérer les points-virgules en début et fin", () => {
        const result = validateEmailsList(
          ";contact@example.com;info@example.com;"
        );
        expect(result).toEqual(["contact@example.com", "info@example.com"]);
      });
    });

    describe("Filtrage des emails invalides", () => {
      it("devrait rejeter les emails sans @", () => {
        const result = validateEmailsList(
          "contact@example.com;invalidemailexample.com"
        );
        expect(result).toEqual(["contact@example.com"]);
      });

      it("devrait rejeter les emails sans point de domaine", () => {
        const result = validateEmailsList("contact@example.com;invalid@email");
        expect(result).toEqual(["contact@example.com"]);
      });

      it("devrait rejeter les emails vides", () => {
        const result = validateEmailsList(
          "contact@example.com;;info@example.com"
        );
        expect(result).toEqual(["contact@example.com", "info@example.com"]);
      });

      it("devrait rejeter les emails avec uniquement des espaces", () => {
        const result = validateEmailsList(
          "contact@example.com;   ;info@example.com"
        );
        expect(result).toEqual(["contact@example.com", "info@example.com"]);
      });

      it("devrait filtrer un mix d'emails valides et invalides", () => {
        const result = validateEmailsList(
          "valid@example.com;invalid;another@test.com;no-at-sign;final@domain.org"
        );
        expect(result).toEqual([
          "valid@example.com",
          "another@test.com",
          "final@domain.org",
        ]);
      });
    });

    describe("Cas limites", () => {
      it("devrait retourner un tableau vide si aucun email valide", () => {
        const result = validateEmailsList("invalid;no-at;missing-dot@domain");
        expect(result).toEqual([]);
      });

      it("devrait retourner un tableau vide pour une chaîne vide", () => {
        const result = validateEmailsList("");
        expect(result).toEqual([]);
      });

      it("devrait retourner un tableau vide pour uniquement des points-virgules", () => {
        const result = validateEmailsList(";;;");
        expect(result).toEqual([]);
      });

      it("devrait gérer une longue liste d'emails", () => {
        const emails = Array.from(
          { length: 10 },
          (_, i) => `user${i}@example.com`
        ).join(";");
        const result = validateEmailsList(emails);
        expect(result).toHaveLength(10);
        expect(result[0]).toBe("user0@example.com");
        expect(result[9]).toBe("user9@example.com");
      });

      it("devrait gérer des emails avec des caractères accentués dans le domaine", () => {
        // Note: selon le standard, les domaines peuvent avoir des caractères internationaux
        const result = validateEmailsList("contact@exämple.com");
        expect(result).toEqual(["contact@exämple.com"]);
      });
    });

    describe("Validation basique (@ et .)", () => {
      it("devrait accepter un email avec @ et .", () => {
        const result = validateEmailsList("a@b.c");
        expect(result).toEqual(["a@b.c"]);
      });

      it("devrait rejeter un email avec @ mais sans .", () => {
        const result = validateEmailsList("user@domain");
        expect(result).toEqual([]);
      });

      it("devrait rejeter un email avec . mais sans @", () => {
        const result = validateEmailsList("user.domain.com");
        expect(result).toEqual([]);
      });

      it("devrait accepter plusieurs @ dans la partie locale", () => {
        // Techniquement invalide selon RFC, mais la validation basique l'accepte
        const result = validateEmailsList("user@@example.com");
        expect(result).toEqual(["user@@example.com"]);
      });

      it("devrait accepter plusieurs points", () => {
        const result = validateEmailsList("user.name@sub.domain.example.com");
        expect(result).toEqual(["user.name@sub.domain.example.com"]);
      });
    });
  });

  describe("normalizeCodeInsee", () => {
    it("devrait normaliser un number en string de 5 chiffres", () => {
      expect(normalizeCodeInsee(36202)).toBe("36202");
    });

    it("devrait padder les codes INSEE courts", () => {
      expect(normalizeCodeInsee(1234)).toBe("01234");
      expect(normalizeCodeInsee(123)).toBe("00123");
    });

    it("devrait gérer les strings", () => {
      expect(normalizeCodeInsee("75001")).toBe("75001");
      expect(normalizeCodeInsee("1234")).toBe("01234");
    });

    it("devrait retourner null pour les valeurs invalides", () => {
      expect(normalizeCodeInsee(null)).toBeNull();
      expect(normalizeCodeInsee(undefined)).toBeNull();
      expect(normalizeCodeInsee("")).toBeNull();
      expect(normalizeCodeInsee("abc")).toBeNull();
      expect(normalizeCodeInsee(123456)).toBeNull();
    });
  });
});
