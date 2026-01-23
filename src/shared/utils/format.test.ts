import { describe, it, expect } from "vitest";
import { formatNomComplet, formatCommune } from "./format.utils";

describe("format.utils", () => {
  describe("formatNomComplet", () => {
    it("devrait retourner le prénom et nom concaténés", () => {
      expect(formatNomComplet("Jean", "Dupont")).toBe("Jean Dupont");
    });

    it("devrait retourner seulement le prénom si nom est null", () => {
      expect(formatNomComplet("Jean", null)).toBe("Jean");
    });

    it("devrait retourner seulement le prénom si nom est undefined", () => {
      expect(formatNomComplet("Jean", undefined)).toBe("Jean");
    });

    it("devrait retourner seulement le nom si prénom est null", () => {
      expect(formatNomComplet(null, "Dupont")).toBe("Dupont");
    });

    it("devrait retourner seulement le nom si prénom est undefined", () => {
      expect(formatNomComplet(undefined, "Dupont")).toBe("Dupont");
    });

    it("devrait retourner 'Non renseigné' si prénom et nom sont null", () => {
      expect(formatNomComplet(null, null)).toBe("Non renseigné");
    });

    it("devrait retourner 'Non renseigné' si prénom et nom sont undefined", () => {
      expect(formatNomComplet(undefined, undefined)).toBe("Non renseigné");
    });

    it("devrait gérer les chaînes vides comme des valeurs falsy", () => {
      expect(formatNomComplet("", "Dupont")).toBe("Dupont");
      expect(formatNomComplet("Jean", "")).toBe("Jean");
      expect(formatNomComplet("", "")).toBe("Non renseigné");
    });
  });

  describe("formatCommune", () => {
    it("devrait retourner la commune avec le code département entre parenthèses", () => {
      expect(formatCommune("Le Poinçonnet", "36")).toBe("Le Poinçonnet (36)");
    });

    it("devrait retourner seulement la commune si code département est null", () => {
      expect(formatCommune("Paris", null)).toBe("Paris");
    });

    it("devrait retourner seulement la commune si code département est undefined", () => {
      expect(formatCommune("Paris", undefined)).toBe("Paris");
    });

    it("devrait retourner '—' si commune est null", () => {
      expect(formatCommune(null, "75")).toBe("—");
    });

    it("devrait retourner '—' si commune et code département sont null", () => {
      expect(formatCommune(null, null)).toBe("—");
    });

    it("devrait retourner '—' si commune et code département sont undefined", () => {
      expect(formatCommune(undefined, undefined)).toBe("—");
    });

    it("devrait gérer les chaînes vides comme des valeurs falsy", () => {
      expect(formatCommune("", "36")).toBe("—");
      expect(formatCommune("Paris", "")).toBe("Paris");
      expect(formatCommune("", "")).toBe("—");
    });
  });
});
