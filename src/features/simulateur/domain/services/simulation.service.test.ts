import { describe, it, expect } from "vitest";
import { SimulationService } from "./simulation.service";
import { SimulateurStep } from "../value-objects/simulateur-step.enum";

describe("SimulationService", () => {
  const anneeAncienne = (new Date().getFullYear() - 20).toString();

  describe("create", () => {
    it("crée un état initial à l'étape INTRO", () => {
      const state = SimulationService.create();

      expect(state.currentStep).toBe(SimulateurStep.INTRO);
      expect(state.answers).toEqual({});
      expect(state.history).toEqual([]);
      expect(state.result).toBeNull();
      expect(state.startedAt).toBeDefined();
      expect(state.updatedAt).toBeDefined();
    });
  });

  describe("start", () => {
    it("passe de INTRO à TYPE_LOGEMENT", () => {
      const state = SimulationService.create();
      const newState = SimulationService.start(state);

      expect(newState.currentStep).toBe(SimulateurStep.TYPE_LOGEMENT);
      expect(newState.history).toContain(SimulateurStep.INTRO);
    });

    it("ne fait rien si pas à l'étape INTRO", () => {
      const state = {
        ...SimulationService.create(),
        currentStep: SimulateurStep.ADRESSE,
      };
      const newState = SimulationService.start(state);

      expect(newState.currentStep).toBe(SimulateurStep.ADRESSE);
    });
  });

  describe("submitAnswer", () => {
    it("avance à l'étape suivante avec une réponse valide", () => {
      const state = SimulationService.start(SimulationService.create());
      const newState = SimulationService.submitAnswer(state, {
        logement: { type: "maison" },
      });

      expect(newState.currentStep).toBe(SimulateurStep.ADRESSE);
      expect(newState.answers.logement?.type).toBe("maison");
      expect(newState.history).toContain(SimulateurStep.TYPE_LOGEMENT);
    });

    it("fusionne les réponses existantes", () => {
      let state = SimulationService.start(SimulationService.create());

      // Étape 1
      state = SimulationService.submitAnswer(state, {
        logement: { type: "maison" },
      });

      // Étape 2
      state = SimulationService.submitAnswer(state, {
        logement: {
          code_departement: "47",
          zone_dexposition: "fort",
          annee_de_construction: anneeAncienne,
          niveaux: 2,
        },
      });

      expect(state.answers.logement?.type).toBe("maison");
      expect(state.answers.logement?.code_departement).toBe("47");
    });

    it("déclenche early exit vers RESULTAT pour appartement", () => {
      const state = SimulationService.start(SimulationService.create());
      const newState = SimulationService.submitAnswer(state, {
        logement: { type: "appartement" },
      });

      expect(newState.currentStep).toBe(SimulateurStep.RESULTAT);
      expect(newState.result).not.toBeNull();
      expect(newState.result?.eligible).toBe(false);
    });

    it("déclenche early exit vers RESULTAT pour zone non forte", () => {
      let state = SimulationService.start(SimulationService.create());

      state = SimulationService.submitAnswer(state, {
        logement: { type: "maison" },
      });

      state = SimulationService.submitAnswer(state, {
        logement: {
          code_departement: "47",
          zone_dexposition: "faible",
          annee_de_construction: anneeAncienne,
          niveaux: 2,
        },
      });

      expect(state.currentStep).toBe(SimulateurStep.RESULTAT);
      expect(state.result?.eligible).toBe(false);
    });

    it("termine avec éligible pour un parcours complet valide", () => {
      let state = SimulationService.start(SimulationService.create());

      // Étape 1 - Type logement
      state = SimulationService.submitAnswer(state, {
        logement: { type: "maison" },
      });

      // Étape 2 - Adresse
      state = SimulationService.submitAnswer(state, {
        logement: {
          code_departement: "47",
          zone_dexposition: "fort",
          code_region: "75",
          annee_de_construction: anneeAncienne,
          niveaux: 2,
        },
      });

      // Étape 3 - État maison
      state = SimulationService.submitAnswer(state, {
        rga: { sinistres: "saine" },
      });

      // Étape 4 - Mitoyenneté
      state = SimulationService.submitAnswer(state, {
        logement: { mitoyen: false },
      });

      // Étape 5 - Indemnisation
      state = SimulationService.submitAnswer(state, {
        rga: { indemnise_indemnise_rga: false },
      });

      // Étape 6 - Assurance
      state = SimulationService.submitAnswer(state, {
        rga: { assure: true },
      });

      // Étape 7 - Propriétaire
      state = SimulationService.submitAnswer(state, {
        logement: { proprietaire_occupant: true },
      });

      // Étape 8 - Revenus
      state = SimulationService.submitAnswer(state, {
        menage: { personnes: 2, revenu_rga: 25000 },
      });

      expect(state.currentStep).toBe(SimulateurStep.RESULTAT);
      expect(state.result).not.toBeNull();
      expect(state.result?.eligible).toBe(true);
    });
  });

  describe("goBack", () => {
    it("revient à l'étape précédente", () => {
      let state = SimulationService.start(SimulationService.create());
      state = SimulationService.submitAnswer(state, {
        logement: { type: "maison" },
      });

      expect(state.currentStep).toBe(SimulateurStep.ADRESSE);

      const newState = SimulationService.goBack(state);

      expect(newState.currentStep).toBe(SimulateurStep.TYPE_LOGEMENT);
      expect(newState.history).not.toContain(SimulateurStep.TYPE_LOGEMENT);
    });

    it("ne fait rien si historique vide", () => {
      const state = SimulationService.create();
      const newState = SimulationService.goBack(state);

      expect(newState.currentStep).toBe(SimulateurStep.INTRO);
    });

    it("efface le résultat en revenant en arrière", () => {
      let state = SimulationService.start(SimulationService.create());
      state = SimulationService.submitAnswer(state, {
        logement: { type: "appartement" },
      });

      expect(state.result).not.toBeNull();

      const newState = SimulationService.goBack(state);

      expect(newState.result).toBeNull();
    });

    it("conserve les réponses en revenant en arrière", () => {
      let state = SimulationService.start(SimulationService.create());
      state = SimulationService.submitAnswer(state, {
        logement: { type: "maison" },
      });

      const newState = SimulationService.goBack(state);

      expect(newState.answers.logement?.type).toBe("maison");
    });
  });

  describe("reset", () => {
    it("réinitialise complètement la simulation", () => {
      let state = SimulationService.start(SimulationService.create());
      state = SimulationService.submitAnswer(state, {
        logement: { type: "maison" },
      });

      const newState = SimulationService.reset();

      expect(newState.currentStep).toBe(SimulateurStep.INTRO);
      expect(newState.answers).toEqual({});
      expect(newState.history).toEqual([]);
      expect(newState.result).toBeNull();
    });
  });

  describe("canGoBack", () => {
    it("retourne false à l'étape INTRO", () => {
      const state = SimulationService.create();
      expect(SimulationService.canGoBack(state)).toBe(false);
    });

    it("retourne true après avoir avancé", () => {
      let state = SimulationService.start(SimulationService.create());
      state = SimulationService.submitAnswer(state, {
        logement: { type: "maison" },
      });

      expect(SimulationService.canGoBack(state)).toBe(true);
    });
  });

  describe("isFinished", () => {
    it("retourne false pour une simulation en cours", () => {
      const state = SimulationService.create();
      expect(SimulationService.isFinished(state)).toBe(false);
    });

    it("retourne true après early exit", () => {
      let state = SimulationService.start(SimulationService.create());
      state = SimulationService.submitAnswer(state, {
        logement: { type: "appartement" },
      });

      expect(SimulationService.isFinished(state)).toBe(true);
    });
  });

  describe("isEligible", () => {
    it("retourne false pour une simulation en cours", () => {
      const state = SimulationService.create();
      expect(SimulationService.isEligible(state)).toBe(false);
    });

    it("retourne false après early exit non éligible", () => {
      let state = SimulationService.start(SimulationService.create());
      state = SimulationService.submitAnswer(state, {
        logement: { type: "appartement" },
      });

      expect(SimulationService.isEligible(state)).toBe(false);
    });

    it("retourne true pour un parcours éligible complet", () => {
      let state = SimulationService.start(SimulationService.create());

      // Parcours complet éligible (simplifié)
      state = SimulationService.submitAnswer(state, { logement: { type: "maison" } });
      state = SimulationService.submitAnswer(state, {
        logement: {
          code_departement: "47",
          zone_dexposition: "fort",
          code_region: "75",
          annee_de_construction: anneeAncienne,
          niveaux: 2,
        },
      });
      state = SimulationService.submitAnswer(state, { rga: { sinistres: "saine" } });
      state = SimulationService.submitAnswer(state, { logement: { mitoyen: false } });
      state = SimulationService.submitAnswer(state, { rga: { indemnise_indemnise_rga: false } });
      state = SimulationService.submitAnswer(state, { rga: { assure: true } });
      state = SimulationService.submitAnswer(state, { logement: { proprietaire_occupant: true } });
      state = SimulationService.submitAnswer(state, { menage: { personnes: 2, revenu_rga: 25000 } });

      expect(SimulationService.isEligible(state)).toBe(true);
    });
  });
});
