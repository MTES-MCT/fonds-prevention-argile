import { describe, it, expect, beforeEach, vi } from "vitest";
import { render } from "@testing-library/react";
import { useEffect } from "react";
import { useSimulateurStore } from "../stores/simulateur.store";
import { SimulateurStep } from "../domain/value-objects/simulateur-step.enum";
import { SimulateurEdition } from "./SimulateurEdition";

/** Ce que le formulaire voit du store à son tout premier effet. */
const vuAuPremierEffet: { editMode?: boolean; currentStep?: string } = {};

vi.mock("./SimulateurFormulaire", () => ({
  SimulateurFormulaire: () => {
    useEffect(() => {
      const state = useSimulateurStore.getState();
      vuAuPremierEffet.editMode = state.editMode;
      vuAuPremierEffet.currentStep = state.simulation.currentStep;
    }, []);
    return <div data-testid="formulaire" />;
  },
}));

describe("SimulateurEdition", () => {
  beforeEach(() => {
    delete vuAuPremierEffet.editMode;
    delete vuAuPremierEffet.currentStep;
    // Session précédente laissée sur l'écran de résultat (sessionStorage persisté) :
    // c'est l'état qui déclenchait le commit parasite.
    useSimulateurStore.setState((state) => ({
      editMode: false,
      simulation: { ...state.simulation, currentStep: SimulateurStep.RESULTAT },
    }));
  });

  it("ne monte le formulaire qu'une fois le mode édition posé", () => {
    render(<SimulateurEdition nomComplet="Georges Dupont" initialData={null} onSave={vi.fn()} />);

    // Sans le verrou, l'effet enfant passait avant celui du parent : `editMode` valait
    // false sur l'étape « resultat », et le formulaire réécrivait le cache local RGA.
    expect(vuAuPremierEffet.editMode).toBe(true);
    expect(vuAuPremierEffet.currentStep).not.toBe(SimulateurStep.RESULTAT);
  });
});
