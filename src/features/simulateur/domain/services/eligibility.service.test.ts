import { describe, it, expect } from "vitest";
import { EligibilityService } from "./eligibility.service";
import type { PartialRGASimulationData } from "@/shared/domain/types";
import { EligibilityReason } from "../value-objects/eligibility-reason.enum";

describe("EligibilityService", () => {
  const anneeAncienne = (new Date().getFullYear() - 20).toString();

  const createEligibleAnswers = (): PartialRGASimulationData => ({
    logement: {
      type: "maison",
      code_departement: "47",
      zone_dexposition: "fort",
      code_region: "75",
      annee_de_construction: anneeAncienne,
      niveaux: 2,
      mitoyen: false,
      proprietaire_occupant: true,
    },
    rga: {
      sinistres: "saine",
      indemnise_indemnise_rga: false,
      assure: true,
    },
    menage: {
      personnes: 2,
      revenu_rga: 25000,
    },
  });

  describe("evaluate", () => {
    it("retourne result null pour une simulation vide", () => {
      const { result, isComplete } = EligibilityService.evaluate({});
      expect(result).toBeNull();
      expect(isComplete).toBe(false);
    });

    it("retourne result null pour une simulation partielle", () => {
      const answers: PartialRGASimulationData = {
        logement: { type: "maison" },
      };
      const { result, isComplete } = EligibilityService.evaluate(answers);
      expect(result).toBeNull();
      expect(isComplete).toBe(false);
    });

    it("retourne éligible pour un dossier complet valide", () => {
      const answers = createEligibleAnswers();
      const { result, checks, isComplete } = EligibilityService.evaluate(answers);

      expect(result).not.toBeNull();
      expect(result?.eligible).toBe(true);
      expect(result?.reason).toBeUndefined();
      expect(isComplete).toBe(true);
      expect(checks.maison).toBe(true);
      expect(checks.revenusEligibles).toBe(true);
    });

    it("retourne non éligible avec raison APPARTEMENT", () => {
      const answers: PartialRGASimulationData = {
        logement: { type: "appartement" },
      };
      const { result, checks } = EligibilityService.evaluate(answers);

      expect(result).not.toBeNull();
      expect(result?.eligible).toBe(false);
      expect(result?.reason).toBe(EligibilityReason.APPARTEMENT);
      expect(checks.maison).toBe(false);
    });

    it("retourne non éligible avec raison DEPARTEMENT_NON_ELIGIBLE", () => {
      const answers: PartialRGASimulationData = {
        logement: {
          type: "maison",
          code_departement: "75",
        },
      };
      const { result, checks } = EligibilityService.evaluate(answers);

      expect(result).not.toBeNull();
      expect(result?.eligible).toBe(false);
      expect(result?.reason).toBe(EligibilityReason.DEPARTEMENT_NON_ELIGIBLE);
      expect(checks.maison).toBe(true);
      expect(checks.departementEligible).toBe(false);
    });

    it("retourne non éligible avec raison ZONE_NON_FORTE", () => {
      const answers: PartialRGASimulationData = {
        logement: {
          type: "maison",
          code_departement: "47",
          zone_dexposition: "moyen",
        },
      };
      const { result } = EligibilityService.evaluate(answers);

      expect(result?.eligible).toBe(false);
      expect(result?.reason).toBe(EligibilityReason.ZONE_NON_FORTE);
    });

    it("retourne non éligible avec raison CONSTRUCTION_RECENTE", () => {
      const anneeRecente = (new Date().getFullYear() - 5).toString();
      const answers: PartialRGASimulationData = {
        logement: {
          type: "maison",
          code_departement: "47",
          zone_dexposition: "fort",
          annee_de_construction: anneeRecente,
        },
      };
      const { result } = EligibilityService.evaluate(answers);

      expect(result?.eligible).toBe(false);
      expect(result?.reason).toBe(EligibilityReason.CONSTRUCTION_RECENTE);
    });

    it("retourne non éligible avec raison TROP_DE_NIVEAUX", () => {
      const answers: PartialRGASimulationData = {
        logement: {
          type: "maison",
          code_departement: "47",
          zone_dexposition: "fort",
          annee_de_construction: anneeAncienne,
          niveaux: 5,
        },
      };
      const { result } = EligibilityService.evaluate(answers);

      expect(result?.eligible).toBe(false);
      expect(result?.reason).toBe(EligibilityReason.TROP_DE_NIVEAUX);
    });

    it("retourne non éligible avec raison MAISON_ENDOMMAGEE", () => {
      const answers: PartialRGASimulationData = {
        logement: {
          type: "maison",
          code_departement: "47",
          zone_dexposition: "fort",
          annee_de_construction: anneeAncienne,
          niveaux: 2,
        },
        rga: {
          sinistres: "endommagée",
        },
      };
      const { result } = EligibilityService.evaluate(answers);

      expect(result?.eligible).toBe(false);
      expect(result?.reason).toBe(EligibilityReason.MAISON_ENDOMMAGEE);
    });

    it("retourne non éligible avec raison MAISON_MITOYENNE", () => {
      const answers: PartialRGASimulationData = {
        logement: {
          type: "maison",
          code_departement: "47",
          zone_dexposition: "fort",
          annee_de_construction: anneeAncienne,
          niveaux: 2,
          mitoyen: true,
        },
        rga: {
          sinistres: "saine",
        },
      };
      const { result } = EligibilityService.evaluate(answers);

      expect(result?.eligible).toBe(false);
      expect(result?.reason).toBe(EligibilityReason.MAISON_MITOYENNE);
    });

    it("retourne non éligible avec raison DEJA_INDEMNISE", () => {
      const answers: PartialRGASimulationData = {
        logement: {
          type: "maison",
          code_departement: "47",
          zone_dexposition: "fort",
          annee_de_construction: anneeAncienne,
          niveaux: 2,
          mitoyen: false,
        },
        rga: {
          sinistres: "saine",
          indemnise_indemnise_rga: true,
          indemnise_montant_indemnite: 15000,
        },
      };
      const { result } = EligibilityService.evaluate(answers);

      expect(result?.eligible).toBe(false);
      expect(result?.reason).toBe(EligibilityReason.DEJA_INDEMNISE);
    });

    it("retourne non éligible avec raison NON_ASSURE", () => {
      const answers: PartialRGASimulationData = {
        logement: {
          type: "maison",
          code_departement: "47",
          zone_dexposition: "fort",
          annee_de_construction: anneeAncienne,
          niveaux: 2,
          mitoyen: false,
        },
        rga: {
          sinistres: "saine",
          indemnise_indemnise_rga: false,
          assure: false,
        },
      };
      const { result } = EligibilityService.evaluate(answers);

      expect(result?.eligible).toBe(false);
      expect(result?.reason).toBe(EligibilityReason.NON_ASSURE);
    });

    it("retourne non éligible avec raison NON_PROPRIETAIRE_OCCUPANT", () => {
      const answers: PartialRGASimulationData = {
        logement: {
          type: "maison",
          code_departement: "47",
          zone_dexposition: "fort",
          annee_de_construction: anneeAncienne,
          niveaux: 2,
          mitoyen: false,
          proprietaire_occupant: false,
        },
        rga: {
          sinistres: "saine",
          indemnise_indemnise_rga: false,
          assure: true,
        },
      };
      const { result } = EligibilityService.evaluate(answers);

      expect(result?.eligible).toBe(false);
      expect(result?.reason).toBe(EligibilityReason.NON_PROPRIETAIRE_OCCUPANT);
    });

    it("retourne non éligible avec raison REVENUS_TROP_ELEVES", () => {
      const answers: PartialRGASimulationData = {
        logement: {
          type: "maison",
          code_departement: "47",
          zone_dexposition: "fort",
          code_region: "75",
          annee_de_construction: anneeAncienne,
          niveaux: 2,
          mitoyen: false,
          proprietaire_occupant: true,
        },
        rga: {
          sinistres: "saine",
          indemnise_indemnise_rga: false,
          assure: true,
        },
        menage: {
          personnes: 1,
          revenu_rga: 200000,
        },
      };
      const { result } = EligibilityService.evaluate(answers);

      expect(result?.eligible).toBe(false);
      expect(result?.reason).toBe(EligibilityReason.REVENUS_TROP_ELEVES);
    });
  });

  describe("getReasonMessage", () => {
    it("retourne le message pour APPARTEMENT", () => {
      const message = EligibilityService.getReasonMessage(EligibilityReason.APPARTEMENT);
      expect(message).toContain("maison");
    });

    it("retourne le message pour DEPARTEMENT_NON_ELIGIBLE", () => {
      const message = EligibilityService.getReasonMessage(EligibilityReason.DEPARTEMENT_NON_ELIGIBLE);
      expect(message).toContain("département");
    });
  });

  describe("toRGASimulationData", () => {
    it("retourne null pour des données incomplètes", () => {
      const answers: PartialRGASimulationData = {
        logement: { type: "maison" },
      };
      const result = EligibilityService.toRGASimulationData(answers);
      expect(result).toBeNull();
    });

    it("retourne les données complètes avec simulatedAt", () => {
      const answers = createEligibleAnswers();
      const result = EligibilityService.toRGASimulationData(answers);

      expect(result).not.toBeNull();
      expect(result?.simulatedAt).toBeDefined();
      expect(result?.logement.type).toBe("maison");
      expect(result?.menage.personnes).toBe(2);
    });
  });
});
