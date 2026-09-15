import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useSimulateurFormulaire } from "./useSimulateurFormulaire";
import { useSimulateurStore } from "../stores/simulateur.store";
import { useRGAStore } from "../stores/rga.store";
import { SimulateurStep } from "../domain/value-objects/simulateur-step.enum";

const APPARTEMENT_A_MOULINS = {
  logement: { type: "appartement", code_departement: "03", commune: "03185" },
};

describe("useSimulateurFormulaire - commitToRGAStore", () => {
  beforeEach(() => {
    useSimulateurStore.getState().reset();
    useSimulateurStore.getState().setHydrated();
    useRGAStore.getState().clearRGA();
  });

  const seedAnswers = (answers: Record<string, unknown>) => {
    useSimulateurStore.setState((state) => ({
      simulation: { ...state.simulation, currentStep: SimulateurStep.RESULTAT, answers },
    }));
  };

  it("enregistre une simulation NON éligible (sinon le demandeur reste sans département)", () => {
    seedAnswers(APPARTEMENT_A_MOULINS);

    const { result } = renderHook(() => useSimulateurFormulaire());
    act(() => result.current.commitToRGAStore());

    const stored = useRGAStore.getState().tempRgaData;
    expect(stored?.logement?.code_departement).toBe("03");
    expect(stored?.simulatedAt).toBeTruthy();
  });

  it("ne commit rien quand aucune réponse n'a été saisie", () => {
    seedAnswers({});

    const { result } = renderHook(() => useSimulateurFormulaire());
    act(() => result.current.commitToRGAStore());

    expect(useRGAStore.getState().tempRgaData).toBeNull();
  });
});
