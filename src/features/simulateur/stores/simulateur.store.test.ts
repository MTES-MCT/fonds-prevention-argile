import { describe, it, expect, beforeEach } from "vitest";
import { useSimulateurStore } from "./simulateur.store";
import { SimulateurStep } from "../domain/value-objects/simulateur-step.enum";

/**
 * `editMode` et `earlyExit` sont deux flags orthogonaux depuis le découplage :
 * l'édition AMO préserve les réponses SANS early exit, le wizard invitation
 * préserve les réponses AVEC early exit.
 */
describe("useSimulateurStore - earlyExit", () => {
  beforeEach(() => {
    useSimulateurStore.getState().reset();
  });

  const goToTypeLogement = () => {
    useSimulateurStore.setState((state) => ({
      simulation: {
        ...state.simulation,
        currentStep: SimulateurStep.TYPE_LOGEMENT,
        history: [],
        answers: {},
        result: null,
      },
    }));
  };

  it("est activé par défaut", () => {
    expect(useSimulateurStore.getState().earlyExit).toBe(true);
  });

  it("coupe la simulation dès un critère éliminatoire quand il est activé", () => {
    goToTypeLogement();
    useSimulateurStore.getState().submitAnswer({ logement: { type: "appartement" } });

    const { simulation } = useSimulateurStore.getState();
    expect(simulation.currentStep).toBe(SimulateurStep.RESULTAT);
    expect(simulation.result?.eligible).toBe(false);
  });

  it("laisse continuer la saisie quand il est désactivé (édition AMO)", () => {
    goToTypeLogement();
    useSimulateurStore.getState().setEarlyExit(false);
    useSimulateurStore.getState().submitAnswer({ logement: { type: "appartement" } });

    const { simulation } = useSimulateurStore.getState();
    expect(simulation.currentStep).not.toBe(SimulateurStep.RESULTAT);
    expect(simulation.result).toBeNull();
  });

  it("est indépendant de editMode", () => {
    useSimulateurStore.getState().setEditMode(true);
    expect(useSimulateurStore.getState().earlyExit).toBe(true);

    useSimulateurStore.getState().setEarlyExit(false);
    expect(useSimulateurStore.getState().editMode).toBe(true);
  });

  it("est restauré à true par reset()", () => {
    useSimulateurStore.getState().setEarlyExit(false);
    useSimulateurStore.getState().reset();

    expect(useSimulateurStore.getState().earlyExit).toBe(true);
    expect(useSimulateurStore.getState().deferEarlyExitUntil).toBeNull();
  });
});

/**
 * Sans adresse, le dossier créé n'a ni département ni EPCI : il devient
 * invisible pour l'aller-vers qui vient de le créer (matchesTerritoire).
 */
describe("useSimulateurStore - early exit différé à l'adresse", () => {
  beforeEach(() => {
    useSimulateurStore.getState().reset();
    useSimulateurStore.setState((state) => ({
      simulation: {
        ...state.simulation,
        currentStep: SimulateurStep.TYPE_LOGEMENT,
        history: [],
        answers: {},
        result: null,
      },
    }));
    useSimulateurStore.getState().setEarlyExit(true, SimulateurStep.ADRESSE);
  });

  it("ne coupe pas sur un critère bloquant tant que l'adresse n'est pas saisie", () => {
    useSimulateurStore.getState().submitAnswer({ logement: { type: "appartement" } });

    const { simulation } = useSimulateurStore.getState();
    expect(simulation.currentStep).toBe(SimulateurStep.ADRESSE);
    expect(simulation.result).toBeNull();
  });

  it("coupe dès l'adresse saisie, en conservant les données territoriales", () => {
    useSimulateurStore.getState().submitAnswer({ logement: { type: "appartement" } });
    useSimulateurStore.getState().submitAnswer({
      logement: { code_departement: "16", commune: "16015", epci: "200070514" },
    });

    const { simulation } = useSimulateurStore.getState();
    expect(simulation.currentStep).toBe(SimulateurStep.RESULTAT);
    expect(simulation.result?.eligible).toBe(false);
    expect(simulation.answers.logement?.code_departement).toBe("16");
  });

  it("coupe immédiatement sur un critère postérieur à l'adresse", () => {
    useSimulateurStore.getState().submitAnswer({ logement: { type: "maison" } });
    useSimulateurStore.getState().submitAnswer({
      logement: {
        code_departement: "16",
        commune: "16015",
        zone_dexposition: "faible",
        annee_de_construction: "1980",
        niveaux: 1,
      },
    });

    const { simulation } = useSimulateurStore.getState();
    expect(simulation.currentStep).toBe(SimulateurStep.RESULTAT);
    expect(simulation.result?.eligible).toBe(false);
  });
});
