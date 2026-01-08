import { describe, it, expect } from "vitest";
import {
  getNextStep,
  getPreviousStep,
  canGoToStep,
  evaluateEligibility,
  isSimulationComplete,
} from "./step-flow.rules";
import { SimulateurStep } from "../../value-objects/simulateur-step.enum";
import type { PartialRGASimulationData } from "@/shared/domain/types";

describe("step-flow.rules", () => {
  describe("getNextStep", () => {
    it("retourne TYPE_LOGEMENT après INTRO", () => {
      expect(getNextStep(SimulateurStep.INTRO)).toBe(SimulateurStep.TYPE_LOGEMENT);
    });

    it("retourne ADRESSE après TYPE_LOGEMENT", () => {
      expect(getNextStep(SimulateurStep.TYPE_LOGEMENT)).toBe(SimulateurStep.ADRESSE);
    });

    it("retourne ETAT_MAISON après ADRESSE", () => {
      expect(getNextStep(SimulateurStep.ADRESSE)).toBe(SimulateurStep.ETAT_MAISON);
    });

    it("retourne MITOYENNETE après ETAT_MAISON", () => {
      expect(getNextStep(SimulateurStep.ETAT_MAISON)).toBe(SimulateurStep.MITOYENNETE);
    });

    it("retourne INDEMNISATION après MITOYENNETE", () => {
      expect(getNextStep(SimulateurStep.MITOYENNETE)).toBe(SimulateurStep.INDEMNISATION);
    });

    it("retourne ASSURANCE après INDEMNISATION", () => {
      expect(getNextStep(SimulateurStep.INDEMNISATION)).toBe(SimulateurStep.ASSURANCE);
    });

    it("retourne PROPRIETAIRE après ASSURANCE", () => {
      expect(getNextStep(SimulateurStep.ASSURANCE)).toBe(SimulateurStep.PROPRIETAIRE);
    });

    it("retourne REVENUS après PROPRIETAIRE", () => {
      expect(getNextStep(SimulateurStep.PROPRIETAIRE)).toBe(SimulateurStep.REVENUS);
    });

    it("retourne RESULTAT après REVENUS", () => {
      expect(getNextStep(SimulateurStep.REVENUS)).toBe(SimulateurStep.RESULTAT);
    });

    it("retourne null après RESULTAT", () => {
      expect(getNextStep(SimulateurStep.RESULTAT)).toBeNull();
    });
  });

  describe("getPreviousStep", () => {
    it("retourne null avant INTRO", () => {
      expect(getPreviousStep(SimulateurStep.INTRO)).toBeNull();
    });

    it("retourne INTRO avant TYPE_LOGEMENT", () => {
      expect(getPreviousStep(SimulateurStep.TYPE_LOGEMENT)).toBe(SimulateurStep.INTRO);
    });

    it("retourne TYPE_LOGEMENT avant ADRESSE", () => {
      expect(getPreviousStep(SimulateurStep.ADRESSE)).toBe(SimulateurStep.TYPE_LOGEMENT);
    });

    it("retourne REVENUS avant RESULTAT", () => {
      expect(getPreviousStep(SimulateurStep.RESULTAT)).toBe(SimulateurStep.REVENUS);
    });
  });

  describe("canGoToStep", () => {
    it("autorise à revenir en arrière", () => {
      expect(canGoToStep(SimulateurStep.TYPE_LOGEMENT, SimulateurStep.ADRESSE)).toBe(true);
    });

    it("autorise à rester sur place", () => {
      expect(canGoToStep(SimulateurStep.ADRESSE, SimulateurStep.ADRESSE)).toBe(true);
    });

    it("interdit d'avancer", () => {
      expect(canGoToStep(SimulateurStep.ADRESSE, SimulateurStep.TYPE_LOGEMENT)).toBe(false);
    });
  });

  describe("evaluateEligibility", () => {
    it("retourne shouldExit false pour des données vides", () => {
      const result = evaluateEligibility({});
      expect(result.shouldExit).toBe(false);
      expect(result.failedAtStep).toBeNull();
    });

    describe("early exit - TYPE_LOGEMENT", () => {
      it("déclenche early exit pour un appartement", () => {
        const answers: PartialRGASimulationData = {
          logement: { type: "appartement" },
        };
        const result = evaluateEligibility(answers);
        expect(result.shouldExit).toBe(true);
        expect(result.failedAtStep).toBe(SimulateurStep.TYPE_LOGEMENT);
        expect(result.checks.maison).toBe(false);
      });

      it("ne déclenche pas early exit pour une maison", () => {
        const answers: PartialRGASimulationData = {
          logement: { type: "maison" },
        };
        const result = evaluateEligibility(answers);
        expect(result.shouldExit).toBe(false);
        expect(result.checks.maison).toBe(true);
      });
    });

    describe("early exit - ADRESSE", () => {
      it("déclenche early exit pour département non éligible", () => {
        const answers: PartialRGASimulationData = {
          logement: {
            type: "maison",
            code_departement: "75",
          },
        };
        const result = evaluateEligibility(answers);
        expect(result.shouldExit).toBe(true);
        expect(result.failedAtStep).toBe(SimulateurStep.ADRESSE);
        expect(result.checks.departementEligible).toBe(false);
      });

      it("déclenche early exit pour zone non forte", () => {
        const answers: PartialRGASimulationData = {
          logement: {
            type: "maison",
            code_departement: "47",
            zone_dexposition: "faible",
          },
        };
        const result = evaluateEligibility(answers);
        expect(result.shouldExit).toBe(true);
        expect(result.failedAtStep).toBe(SimulateurStep.ADRESSE);
        expect(result.checks.zoneForte).toBe(false);
      });

      it("déclenche early exit pour construction trop récente", () => {
        const anneeRecente = (new Date().getFullYear() - 5).toString();
        const answers: PartialRGASimulationData = {
          logement: {
            type: "maison",
            code_departement: "47",
            zone_dexposition: "fort",
            annee_de_construction: anneeRecente,
          },
        };
        const result = evaluateEligibility(answers);
        expect(result.shouldExit).toBe(true);
        expect(result.failedAtStep).toBe(SimulateurStep.ADRESSE);
        expect(result.checks.anneeConstruction).toBe(false);
      });

      it("déclenche early exit pour trop de niveaux", () => {
        const anneeAncienne = (new Date().getFullYear() - 20).toString();
        const answers: PartialRGASimulationData = {
          logement: {
            type: "maison",
            code_departement: "47",
            zone_dexposition: "fort",
            annee_de_construction: anneeAncienne,
            niveaux: 5,
          },
        };
        const result = evaluateEligibility(answers);
        expect(result.shouldExit).toBe(true);
        expect(result.failedAtStep).toBe(SimulateurStep.ADRESSE);
        expect(result.checks.niveaux).toBe(false);
      });
    });

    describe("early exit - ETAT_MAISON", () => {
      it("déclenche early exit pour maison endommagée", () => {
        const anneeAncienne = (new Date().getFullYear() - 20).toString();
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
        const result = evaluateEligibility(answers);
        expect(result.shouldExit).toBe(true);
        expect(result.failedAtStep).toBe(SimulateurStep.ETAT_MAISON);
        expect(result.checks.etatMaison).toBe(false);
      });
    });

    describe("early exit - MITOYENNETE", () => {
      it("déclenche early exit pour maison mitoyenne", () => {
        const anneeAncienne = (new Date().getFullYear() - 20).toString();
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
        const result = evaluateEligibility(answers);
        expect(result.shouldExit).toBe(true);
        expect(result.failedAtStep).toBe(SimulateurStep.MITOYENNETE);
        expect(result.checks.nonMitoyen).toBe(false);
      });
    });

    describe("early exit - INDEMNISATION", () => {
      it("déclenche early exit si indemnisé après le 30 juin 2025", () => {
        const anneeAncienne = (new Date().getFullYear() - 20).toString();
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
            indemnise_avant_juillet_2025: false,
          },
        };
        const result = evaluateEligibility(answers);
        expect(result.shouldExit).toBe(true);
        expect(result.failedAtStep).toBe(SimulateurStep.INDEMNISATION);
        expect(result.checks.indemnisation).toBe(false);
      });

      it("déclenche early exit si indemnisé entre 2015 et 2025 avec montant > 10 000 €", () => {
        const anneeAncienne = (new Date().getFullYear() - 20).toString();
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
            indemnise_avant_juillet_2025: true,
            indemnise_avant_juillet_2015: false,
            indemnise_montant_indemnite: 15000,
          },
        };
        const result = evaluateEligibility(answers);
        expect(result.shouldExit).toBe(true);
        expect(result.failedAtStep).toBe(SimulateurStep.INDEMNISATION);
        expect(result.checks.indemnisation).toBe(false);
      });

      it("ne déclenche pas early exit si indemnisé avant le 1er juillet 2015", () => {
        const anneeAncienne = (new Date().getFullYear() - 20).toString();
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
            indemnise_avant_juillet_2025: true,
            indemnise_avant_juillet_2015: true,
            indemnise_montant_indemnite: 50000, // Montant élevé mais OK car avant 2015
          },
        };
        const result = evaluateEligibility(answers);
        expect(result.shouldExit).toBe(false);
        expect(result.checks.indemnisation).toBe(true);
      });

      it("ne déclenche pas early exit si indemnisé entre 2015 et 2025 avec montant <= 10 000 €", () => {
        const anneeAncienne = (new Date().getFullYear() - 20).toString();
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
            indemnise_avant_juillet_2025: true,
            indemnise_avant_juillet_2015: false,
            indemnise_montant_indemnite: 5000,
          },
        };
        const result = evaluateEligibility(answers);
        expect(result.shouldExit).toBe(false);
        expect(result.checks.indemnisation).toBe(true);
      });
    });

    describe("early exit - ASSURANCE", () => {
      it("déclenche early exit si non assuré", () => {
        const anneeAncienne = (new Date().getFullYear() - 20).toString();
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
        const result = evaluateEligibility(answers);
        expect(result.shouldExit).toBe(true);
        expect(result.failedAtStep).toBe(SimulateurStep.ASSURANCE);
        expect(result.checks.assurance).toBe(false);
      });
    });

    describe("early exit - PROPRIETAIRE", () => {
      it("déclenche early exit si non propriétaire occupant", () => {
        const anneeAncienne = (new Date().getFullYear() - 20).toString();
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
        const result = evaluateEligibility(answers);
        expect(result.shouldExit).toBe(true);
        expect(result.failedAtStep).toBe(SimulateurStep.PROPRIETAIRE);
        expect(result.checks.proprietaireOccupant).toBe(false);
      });
    });

    describe("early exit - REVENUS", () => {
      it("déclenche early exit pour revenus trop élevés", () => {
        const anneeAncienne = (new Date().getFullYear() - 20).toString();
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
        const result = evaluateEligibility(answers);
        expect(result.shouldExit).toBe(true);
        expect(result.failedAtStep).toBe(SimulateurStep.REVENUS);
        expect(result.checks.revenusEligibles).toBe(false);
      });
    });

    describe("parcours complet éligible", () => {
      it("ne déclenche pas early exit pour un dossier éligible complet (jamais indemnisé)", () => {
        const anneeAncienne = (new Date().getFullYear() - 20).toString();
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
            personnes: 2,
            revenu_rga: 25000,
          },
        };
        const result = evaluateEligibility(answers);
        expect(result.shouldExit).toBe(false);
        expect(result.failedAtStep).toBeNull();
        expect(result.checks.maison).toBe(true);
        expect(result.checks.departementEligible).toBe(true);
        expect(result.checks.zoneForte).toBe(true);
        expect(result.checks.anneeConstruction).toBe(true);
        expect(result.checks.niveaux).toBe(true);
        expect(result.checks.etatMaison).toBe(true);
        expect(result.checks.nonMitoyen).toBe(true);
        expect(result.checks.indemnisation).toBe(true);
        expect(result.checks.assurance).toBe(true);
        expect(result.checks.proprietaireOccupant).toBe(true);
        expect(result.checks.revenusEligibles).toBe(true);
      });

      it("ne déclenche pas early exit pour un dossier éligible complet (indemnisé avant 2015)", () => {
        const anneeAncienne = (new Date().getFullYear() - 20).toString();
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
            indemnise_indemnise_rga: true,
            indemnise_avant_juillet_2025: true,
            indemnise_avant_juillet_2015: true,
            indemnise_montant_indemnite: 50000,
            assure: true,
          },
          menage: {
            personnes: 2,
            revenu_rga: 25000,
          },
        };
        const result = evaluateEligibility(answers);
        expect(result.shouldExit).toBe(false);
        expect(result.failedAtStep).toBeNull();
        expect(result.checks.indemnisation).toBe(true);
      });

      it("ne déclenche pas early exit pour un dossier éligible complet (indemnisé 2015-2025, montant faible)", () => {
        const anneeAncienne = (new Date().getFullYear() - 20).toString();
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
            indemnise_indemnise_rga: true,
            indemnise_avant_juillet_2025: true,
            indemnise_avant_juillet_2015: false,
            indemnise_montant_indemnite: 5000,
            assure: true,
          },
          menage: {
            personnes: 2,
            revenu_rga: 25000,
          },
        };
        const result = evaluateEligibility(answers);
        expect(result.shouldExit).toBe(false);
        expect(result.failedAtStep).toBeNull();
        expect(result.checks.indemnisation).toBe(true);
      });
    });
  });

  describe("isSimulationComplete", () => {
    it("retourne false pour des données vides", () => {
      expect(isSimulationComplete({})).toBe(false);
    });

    it("retourne false pour des données partielles", () => {
      const answers: PartialRGASimulationData = {
        logement: { type: "maison" },
      };
      expect(isSimulationComplete(answers)).toBe(false);
    });

    it("retourne true pour des données complètes", () => {
      const anneeAncienne = (new Date().getFullYear() - 20).toString();
      const answers: PartialRGASimulationData = {
        logement: {
          type: "maison",
          code_departement: "47",
          zone_dexposition: "fort",
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
      };
      expect(isSimulationComplete(answers)).toBe(true);
    });
  });
});
