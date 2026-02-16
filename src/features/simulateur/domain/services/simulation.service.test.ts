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

  describe("submitAnswer avec skipEarlyExit (mode édition)", () => {
    const SKIP_EARLY_EXIT = { skipEarlyExit: true };

    it("ne déclenche pas d'early exit pour appartement", () => {
      const state = SimulationService.start(SimulationService.create());
      const newState = SimulationService.submitAnswer(state, { logement: { type: "appartement" } }, SKIP_EARLY_EXIT);

      expect(newState.currentStep).toBe(SimulateurStep.ADRESSE);
      expect(newState.result).toBeNull();
    });

    it("ne déclenche pas d'early exit pour zone non forte", () => {
      let state = SimulationService.start(SimulationService.create());
      state = SimulationService.submitAnswer(state, { logement: { type: "maison" } }, SKIP_EARLY_EXIT);
      state = SimulationService.submitAnswer(
        state,
        {
          logement: {
            code_departement: "47",
            zone_dexposition: "faible",
            annee_de_construction: anneeAncienne,
            niveaux: 2,
          },
        },
        SKIP_EARLY_EXIT,
      );

      expect(state.currentStep).toBe(SimulateurStep.ETAT_MAISON);
      expect(state.result).toBeNull();
    });

    it("permet de parcourir toutes les étapes avec des données non éligibles", () => {
      let state = SimulationService.start(SimulationService.create());

      // Données volontairement non éligibles (zone moyen, maison endommagée)
      state = SimulationService.submitAnswer(state, { logement: { type: "maison" } }, SKIP_EARLY_EXIT);
      expect(state.currentStep).toBe(SimulateurStep.ADRESSE);

      state = SimulationService.submitAnswer(
        state,
        {
          logement: {
            code_departement: "47",
            zone_dexposition: "moyen",
            code_region: "75",
            annee_de_construction: anneeAncienne,
            niveaux: 2,
          },
        },
        SKIP_EARLY_EXIT,
      );
      expect(state.currentStep).toBe(SimulateurStep.ETAT_MAISON);

      state = SimulationService.submitAnswer(state, { rga: { sinistres: "endommagée" } }, SKIP_EARLY_EXIT);
      expect(state.currentStep).toBe(SimulateurStep.MITOYENNETE);

      state = SimulationService.submitAnswer(state, { logement: { mitoyen: true } }, SKIP_EARLY_EXIT);
      expect(state.currentStep).toBe(SimulateurStep.INDEMNISATION);

      state = SimulationService.submitAnswer(state, { rga: { indemnise_indemnise_rga: false } }, SKIP_EARLY_EXIT);
      expect(state.currentStep).toBe(SimulateurStep.ASSURANCE);

      state = SimulationService.submitAnswer(state, { rga: { assure: false } }, SKIP_EARLY_EXIT);
      expect(state.currentStep).toBe(SimulateurStep.PROPRIETAIRE);

      state = SimulationService.submitAnswer(state, { logement: { proprietaire_occupant: false } }, SKIP_EARLY_EXIT);
      expect(state.currentStep).toBe(SimulateurStep.REVENUS);

      // Pas encore au résultat
      expect(state.result).toBeNull();
    });

    it("évalue l'éligibilité à la dernière étape (REVENUS → RESULTAT)", () => {
      let state = SimulationService.start(SimulationService.create());

      // Parcours complet non éligible (zone moyen)
      state = SimulationService.submitAnswer(state, { logement: { type: "maison" } }, SKIP_EARLY_EXIT);
      state = SimulationService.submitAnswer(
        state,
        {
          logement: {
            code_departement: "47",
            zone_dexposition: "moyen",
            code_region: "75",
            annee_de_construction: anneeAncienne,
            niveaux: 2,
          },
        },
        SKIP_EARLY_EXIT,
      );
      state = SimulationService.submitAnswer(state, { rga: { sinistres: "saine" } }, SKIP_EARLY_EXIT);
      state = SimulationService.submitAnswer(state, { logement: { mitoyen: false } }, SKIP_EARLY_EXIT);
      state = SimulationService.submitAnswer(state, { rga: { indemnise_indemnise_rga: false } }, SKIP_EARLY_EXIT);
      state = SimulationService.submitAnswer(state, { rga: { assure: true } }, SKIP_EARLY_EXIT);
      state = SimulationService.submitAnswer(state, { logement: { proprietaire_occupant: true } }, SKIP_EARLY_EXIT);

      // Dernière étape : évaluation déclenchée
      state = SimulationService.submitAnswer(state, { menage: { personnes: 2, revenu_rga: 25000 } }, SKIP_EARLY_EXIT);

      expect(state.currentStep).toBe(SimulateurStep.RESULTAT);
      expect(state.result).not.toBeNull();
      expect(state.result?.eligible).toBe(false);
    });

    it("termine éligible à la dernière étape avec des données valides", () => {
      let state = SimulationService.start(SimulationService.create());

      state = SimulationService.submitAnswer(state, { logement: { type: "maison" } }, SKIP_EARLY_EXIT);
      state = SimulationService.submitAnswer(
        state,
        {
          logement: {
            code_departement: "47",
            zone_dexposition: "fort",
            code_region: "75",
            annee_de_construction: anneeAncienne,
            niveaux: 2,
          },
        },
        SKIP_EARLY_EXIT,
      );
      state = SimulationService.submitAnswer(state, { rga: { sinistres: "saine" } }, SKIP_EARLY_EXIT);
      state = SimulationService.submitAnswer(state, { logement: { mitoyen: false } }, SKIP_EARLY_EXIT);
      state = SimulationService.submitAnswer(state, { rga: { indemnise_indemnise_rga: false } }, SKIP_EARLY_EXIT);
      state = SimulationService.submitAnswer(state, { rga: { assure: true } }, SKIP_EARLY_EXIT);
      state = SimulationService.submitAnswer(state, { logement: { proprietaire_occupant: true } }, SKIP_EARLY_EXIT);
      state = SimulationService.submitAnswer(state, { menage: { personnes: 2, revenu_rga: 25000 } }, SKIP_EARLY_EXIT);

      expect(state.currentStep).toBe(SimulateurStep.RESULTAT);
      expect(state.result?.eligible).toBe(true);
    });

    it("conserve les réponses pré-remplies à chaque transition", () => {
      let state = SimulationService.start(SimulationService.create());

      // Pré-remplir l'état avec toutes les réponses (comme SimulateurEdition)
      const prefilledAnswers = {
        logement: {
          type: "maison" as const,
          code_departement: "47",
          zone_dexposition: "moyen" as const,
          code_region: "75",
          annee_de_construction: anneeAncienne,
          niveaux: 2,
          mitoyen: false,
          proprietaire_occupant: true,
        },
        rga: {
          sinistres: "endommagée" as const,
          indemnise_indemnise_rga: false,
          assure: true,
        },
        menage: {
          personnes: 2,
          revenu_rga: 25000,
        },
      };

      // Injecter les données (comme le ferait SimulateurEdition via setState)
      state = { ...state, answers: prefilledAnswers };

      // Soumettre étape 1 : les données des autres étapes doivent être conservées
      state = SimulationService.submitAnswer(state, { logement: { type: "maison" } }, SKIP_EARLY_EXIT);

      expect(state.currentStep).toBe(SimulateurStep.ADRESSE);
      expect(state.answers.logement?.type).toBe("maison");
      expect(state.answers.rga?.sinistres).toBe("endommagée");
      expect(state.answers.menage?.personnes).toBe(2);
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

  describe("goBack avec preserveAnswers (mode édition)", () => {
    const PRESERVE = { preserveAnswers: true };

    it("préserve les réponses de l'étape quittée", () => {
      let state = SimulationService.start(SimulationService.create());

      // Avancer à ADRESSE
      state = SimulationService.submitAnswer(state, { logement: { type: "maison" } });
      // Avancer à ETAT_MAISON
      state = SimulationService.submitAnswer(state, {
        logement: {
          code_departement: "47",
          zone_dexposition: "fort",
          annee_de_construction: anneeAncienne,
          niveaux: 2,
        },
      });

      expect(state.currentStep).toBe(SimulateurStep.ETAT_MAISON);

      // Retour avec preserveAnswers — les données adresse restent
      const backed = SimulationService.goBack(state, PRESERVE);

      expect(backed.currentStep).toBe(SimulateurStep.ADRESSE);
      expect(backed.answers.logement?.code_departement).toBe("47");
      expect(backed.answers.logement?.zone_dexposition).toBe("fort");
      expect(backed.answers.logement?.annee_de_construction).toBe(anneeAncienne);
      expect(backed.answers.logement?.niveaux).toBe(2);
    });

    it("sans preserveAnswers, efface les réponses de l'étape quittée", () => {
      let state = SimulationService.start(SimulationService.create());

      state = SimulationService.submitAnswer(state, { logement: { type: "maison" } });
      state = SimulationService.submitAnswer(state, {
        logement: {
          code_departement: "47",
          zone_dexposition: "fort",
          annee_de_construction: anneeAncienne,
          niveaux: 2,
        },
      });
      state = SimulationService.submitAnswer(state, { rga: { sinistres: "saine" } });

      expect(state.currentStep).toBe(SimulateurStep.MITOYENNETE);

      // Retour sans preserve — efface les clés de l'étape MITOYENNETE (mitoyen)
      // puis un second retour depuis ETAT_MAISON efface sinistres
      let backed = SimulationService.goBack(state);
      expect(backed.currentStep).toBe(SimulateurStep.ETAT_MAISON);

      backed = SimulationService.goBack(backed);
      expect(backed.currentStep).toBe(SimulateurStep.ADRESSE);
      expect(backed.answers.rga?.sinistres).toBeUndefined();
    });

    it("permet d'aller-retour sans perdre les données pré-remplies", () => {
      let state = SimulationService.start(SimulationService.create());
      const SKIP = { skipEarlyExit: true };

      // Injecter des données pré-remplies
      state = {
        ...state,
        answers: {
          logement: {
            type: "maison" as const,
            code_departement: "47",
            zone_dexposition: "moyen" as const,
            annee_de_construction: anneeAncienne,
            niveaux: 2,
            mitoyen: false,
          },
          rga: { sinistres: "endommagée" as const },
        },
      };

      // Avancer
      state = SimulationService.submitAnswer(state, { logement: { type: "maison" } }, SKIP);
      expect(state.currentStep).toBe(SimulateurStep.ADRESSE);

      state = SimulationService.submitAnswer(
        state,
        { logement: { code_departement: "47", zone_dexposition: "moyen", annee_de_construction: anneeAncienne, niveaux: 2 } },
        SKIP,
      );
      expect(state.currentStep).toBe(SimulateurStep.ETAT_MAISON);

      // Retour avec preserve
      state = SimulationService.goBack(state, PRESERVE);
      expect(state.currentStep).toBe(SimulateurStep.ADRESSE);
      expect(state.answers.rga?.sinistres).toBe("endommagée");

      // Re-avancer
      state = SimulationService.submitAnswer(
        state,
        { logement: { code_departement: "47", zone_dexposition: "fort", annee_de_construction: anneeAncienne, niveaux: 2 } },
        SKIP,
      );
      expect(state.currentStep).toBe(SimulateurStep.ETAT_MAISON);
      expect(state.answers.logement?.zone_dexposition).toBe("fort");
      // Les données des autres étapes sont toujours là
      expect(state.answers.logement?.mitoyen).toBe(false);
    });
  });

  describe("reset", () => {
    it("réinitialise complètement la simulation", () => {
      let state = SimulationService.start(SimulationService.create());
      state = SimulationService.submitAnswer(state, {
        logement: { type: "maison" },
      });

      const newState = SimulationService.reset();

      expect(state.answers).not.toEqual(newState.answers);
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
