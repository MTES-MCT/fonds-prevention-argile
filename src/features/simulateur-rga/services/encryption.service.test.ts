import { describe, it, expect, beforeEach, vi } from "vitest";
import { encryptData, decryptData } from "./encryption.service";
import * as envConfig from "@/shared/config/env.config";

// Mock du module env.config
vi.mock("@/shared/config/env.config", () => ({
  getServerEnv: vi.fn(),
}));

describe("encryption.service", () => {
  // Clé de test valide (32 bytes = 64 caractères hex)
  const VALID_TEST_KEY =
    "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2";

  beforeEach(() => {
    // Reset tous les mocks avant chaque test
    vi.clearAllMocks();

    // Mock par défaut : clé valide
    vi.mocked(envConfig.getServerEnv).mockReturnValue({
      RGA_ENCRYPTION_KEY: VALID_TEST_KEY,
    } as ReturnType<typeof envConfig.getServerEnv>);
  });

  describe("encryptData", () => {
    it("devrait chiffrer des données avec succès", () => {
      const plainText = "Hello, World!";

      const encrypted = encryptData(plainText);

      expect(encrypted).toBeDefined();
      expect(typeof encrypted).toBe("string");
      expect(encrypted.split(":").length).toBe(3); // Format iv:authTag:encrypted
    });

    it("devrait produire des résultats différents à chaque appel (IV aléatoire)", () => {
      const plainText = "Same text";

      const encrypted1 = encryptData(plainText);
      const encrypted2 = encryptData(plainText);

      expect(encrypted1).not.toBe(encrypted2); // IV différent à chaque fois
    });

    it("devrait chiffrer des données complexes (JSON)", () => {
      const complexData = JSON.stringify({
        logement: {
          adresse: "123 rue Test",
          commune: "75001",
        },
        menage: {
          revenu_rga: 50000,
          personnes: 4,
        },
      });

      const encrypted = encryptData(complexData);

      expect(encrypted).toBeDefined();
      expect(encrypted.split(":").length).toBe(3);
    });

    it("devrait lancer une erreur si les données sont vides", () => {
      expect(() => encryptData("")).toThrow("Data must be a non-empty string");
    });

    it("devrait lancer une erreur si les données ne sont pas une chaîne", () => {
      // @ts-expect-error - Test avec mauvais type
      expect(() => encryptData(null)).toThrow(
        "Data must be a non-empty string"
      );

      // @ts-expect-error - Test avec mauvais type
      expect(() => encryptData(undefined)).toThrow(
        "Data must be a non-empty string"
      );

      // @ts-expect-error - Test avec mauvais type
      expect(() => encryptData(123)).toThrow("Data must be a non-empty string");
    });

    it("devrait lancer une erreur si la clé n'est pas configurée", () => {
      vi.mocked(envConfig.getServerEnv).mockReturnValue({
        RGA_ENCRYPTION_KEY: "",
      } as ReturnType<typeof envConfig.getServerEnv>);

      expect(() => encryptData("test")).toThrow(
        "RGA_ENCRYPTION_KEY not configured"
      );
    });

    it("devrait lancer une erreur si la clé a une taille invalide", () => {
      vi.mocked(envConfig.getServerEnv).mockReturnValue({
        RGA_ENCRYPTION_KEY: "trop_court",
      } as ReturnType<typeof envConfig.getServerEnv>);

      expect(() => encryptData("test")).toThrow(
        "RGA_ENCRYPTION_KEY must be 64 hex characters"
      );
    });

    it("devrait lancer une erreur si la clé n'est pas en hexadécimal", () => {
      vi.mocked(envConfig.getServerEnv).mockReturnValue({
        RGA_ENCRYPTION_KEY:
          "zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz",
      } as ReturnType<typeof envConfig.getServerEnv>);

      expect(() => encryptData("test")).toThrow(
        "RGA_ENCRYPTION_KEY must be a valid hex string"
      );
    });
  });

  describe("decryptData", () => {
    it("devrait déchiffrer des données chiffrées", () => {
      const plainText = "Hello, World!";

      const encrypted = encryptData(plainText);
      const decrypted = decryptData(encrypted);

      expect(decrypted).toBe(plainText);
    });

    it("devrait déchiffrer des données complexes (JSON)", () => {
      const complexData = JSON.stringify({
        logement: {
          adresse: "123 rue Test",
          commune: "75001",
        },
        menage: {
          revenu_rga: 50000,
          personnes: 4,
        },
      });

      const encrypted = encryptData(complexData);
      const decrypted = decryptData(encrypted);

      expect(decrypted).toBe(complexData);
      expect(JSON.parse(decrypted)).toEqual(JSON.parse(complexData));
    });

    it("devrait gérer des données vides chiffrées", () => {
      const plainText = " "; // Espace

      const encrypted = encryptData(plainText);
      const decrypted = decryptData(encrypted);

      expect(decrypted).toBe(plainText);
    });

    it("devrait lancer une erreur si les données chiffrées sont vides", () => {
      expect(() => decryptData("")).toThrow(
        "Encrypted data must be a non-empty string"
      );
    });

    it("devrait lancer une erreur si les données chiffrées ne sont pas une chaîne", () => {
      // @ts-expect-error - Test avec mauvais type
      expect(() => decryptData(null)).toThrow(
        "Encrypted data must be a non-empty string"
      );

      // @ts-expect-error - Test avec mauvais type
      expect(() => decryptData(undefined)).toThrow(
        "Encrypted data must be a non-empty string"
      );
    });

    it("devrait lancer une erreur si le format est invalide", () => {
      expect(() => decryptData("invalid")).toThrow("Invalid encrypted format");
      expect(() => decryptData("a:b")).toThrow("Invalid encrypted format");
      expect(() => decryptData("a:b:c:d")).toThrow("Invalid encrypted format");
    });

    it("devrait lancer une erreur si les données ont été modifiées (authTag invalide)", () => {
      const plainText = "Hello, World!";
      const encrypted = encryptData(plainText);

      // Modifier une partie des données chiffrées
      const [iv, authTag, data] = encrypted.split(":");
      const tamperedData = `${iv}:${authTag}:${data}ff`; // Ajouter des caractères

      expect(() => decryptData(tamperedData)).toThrow("Authentication failed");
    });

    it("devrait lancer une erreur si l'IV est invalide", () => {
      const [, authTag, data] = encryptData("test").split(":");
      const invalidIV = "a".repeat(30); // IV trop court (15 bytes au lieu de 16)

      expect(() => decryptData(`${invalidIV}:${authTag}:${data}`)).toThrow(
        "Invalid IV length"
      );
    });

    it("devrait lancer une erreur avec une clé différente", () => {
      const plainText = "Secret data";
      const encrypted = encryptData(plainText);

      // Changer la clé
      const DIFFERENT_KEY =
        "b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2";
      vi.mocked(envConfig.getServerEnv).mockReturnValue({
        RGA_ENCRYPTION_KEY: DIFFERENT_KEY,
      } as ReturnType<typeof envConfig.getServerEnv>);

      expect(() => decryptData(encrypted)).toThrow("Authentication failed");
    });
  });

  describe("Cycle complet chiffrement/déchiffrement", () => {
    it("devrait gérer un cycle complet avec des données RGA réalistes", () => {
      const rgaData = {
        logement: {
          adresse: "19B Rue des Clefs Moreaux 36250 Saint-Maur",
          code_region: "24",
          code_departement: "36",
          commune: "36202",
          annee_de_construction: "1994",
          type: "maison",
          zone_dexposition: "fort",
        },
        menage: {
          revenu_rga: 50576,
          personnes: 7,
        },
        rga: {
          assure: "oui",
          sinistres: "saine",
        },
      };

      const jsonString = JSON.stringify(rgaData);

      const encrypted = encryptData(jsonString);
      const decrypted = decryptData(encrypted);
      const parsedData = JSON.parse(decrypted);

      expect(parsedData).toEqual(rgaData);
    });

    it("devrait préserver les caractères spéciaux et accents", () => {
      const textWithSpecialChars =
        "Données avec accents: é, è, ê, à, ç et caractères spéciaux: €, @, #";

      const encrypted = encryptData(textWithSpecialChars);
      const decrypted = decryptData(encrypted);

      expect(decrypted).toBe(textWithSpecialChars);
    });

    it("devrait gérer des données volumineuses", () => {
      // Simuler des données RGA avec beaucoup de champs
      const largeData = JSON.stringify({
        ...Array.from({ length: 50 })
          .map((_, i) => [`field${i}`, `value${i}`])
          .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {}),
      });

      const encrypted = encryptData(largeData);
      const decrypted = decryptData(encrypted);

      expect(decrypted).toBe(largeData);
    });
  });
});
