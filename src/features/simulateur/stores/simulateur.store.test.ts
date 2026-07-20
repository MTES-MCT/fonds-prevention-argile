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
  });
});
