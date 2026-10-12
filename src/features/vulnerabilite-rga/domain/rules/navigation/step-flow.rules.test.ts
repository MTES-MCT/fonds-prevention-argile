import { describe, it, expect } from "vitest";
import { getNextStep, getPreviousStep, canGoToStep } from "./step-flow.rules";
import { VulnerabiliteStep } from "../../value-objects/vulnerabilite-step.enum";

describe("getNextStep", () => {
  it("enchaîne la proximité de l'arbre sur les haies, l'essence étant posée sur le même écran", () => {
    expect(getNextStep(VulnerabiliteStep.ARBRE_PROXIMITE)).toBe(VulnerabiliteStep.HAIES);
  });

  it("avance étape par étape", () => {
    expect(getNextStep(VulnerabiliteStep.INTRO)).toBe(VulnerabiliteStep.ADRESSE);
    expect(getNextStep(VulnerabiliteStep.ADRESSE)).toBe(VulnerabiliteStep.PENTE_TERRAIN);
    expect(getNextStep(VulnerabiliteStep.ENSOLEILLEMENT)).toBe(VulnerabiliteStep.SOURCE_CHALEUR_SOUS_SOL);
    expect(getNextStep(VulnerabiliteStep.SOURCE_CHALEUR_SOUS_SOL)).toBe(VulnerabiliteStep.RESULTAT);
  });

  it("renvoie null après la dernière étape", () => {
    expect(getNextStep(VulnerabiliteStep.RESULTAT)).toBeNull();
  });
});

describe("getPreviousStep", () => {
  it("revient des haies à la proximité de l'arbre", () => {
    expect(getPreviousStep(VulnerabiliteStep.HAIES)).toBe(VulnerabiliteStep.ARBRE_PROXIMITE);
  });

  it("renvoie null avant la première étape", () => {
    expect(getPreviousStep(VulnerabiliteStep.INTRO)).toBeNull();
  });
});

describe("canGoToStep", () => {
  it("autorise à revenir en arrière ou rester sur place, jamais à avancer directement", () => {
    expect(canGoToStep(VulnerabiliteStep.ADRESSE, VulnerabiliteStep.HAIES)).toBe(true);
    expect(canGoToStep(VulnerabiliteStep.HAIES, VulnerabiliteStep.HAIES)).toBe(true);
    expect(canGoToStep(VulnerabiliteStep.RESULTAT, VulnerabiliteStep.HAIES)).toBe(false);
  });
});
