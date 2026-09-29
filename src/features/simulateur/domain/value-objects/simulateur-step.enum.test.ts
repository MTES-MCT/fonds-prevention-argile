import { describe, it, expect } from "vitest";
import { ETAPES_SAISIE, SimulateurStep, TOTAL_ETAPES, getNumeroEtape } from "./simulateur-step.enum";
import { SIMULATEUR_STEP_EVENTS } from "./matomo-events";

describe("numérotation des étapes", () => {
  it("affiche l'écran des caractéristiques sous le numéro de l'adresse", () => {
    expect(getNumeroEtape(SimulateurStep.ADRESSE)).toBe(2);
    expect(getNumeroEtape(SimulateurStep.CARACTERISTIQUES)).toBe(2);
    expect(getNumeroEtape(SimulateurStep.ETAT_MAISON)).toBe(3);
  });

  it("ne compte pas l'écran des caractéristiques dans le total", () => {
    expect(TOTAL_ETAPES).toBe(9);
    expect(getNumeroEtape(SimulateurStep.REVENUS)).toBe(TOTAL_ETAPES);
  });

  it("trace chaque écran de saisie dans le funnel Matomo", () => {
    for (const etape of ETAPES_SAISIE) {
      expect(SIMULATEUR_STEP_EVENTS[etape]).toBeDefined();
    }
    expect(SIMULATEUR_STEP_EVENTS[SimulateurStep.CARACTERISTIQUES]).toBe("simulateur_step_caracteristiques");
  });
});
