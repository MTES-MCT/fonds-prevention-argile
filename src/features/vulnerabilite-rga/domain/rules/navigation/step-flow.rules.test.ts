import { describe, it, expect } from "vitest";
import { getNextStep, getPreviousStep, canGoToStep } from "./step-flow.rules";
import { VulnerabiliteStep } from "../../value-objects/vulnerabilite-step.enum";
import type { PartialVulnerabiliteReponses } from "../../types/vulnerabilite-reponses.types";

const SANS_ARBRE: PartialVulnerabiliteReponses = { vegetation: { arbre_proximite: "non" } };
const AVEC_ARBRE: PartialVulnerabiliteReponses = { vegetation: { arbre_proximite: "oui" } };
const SANS_REPONSE: PartialVulnerabiliteReponses = {};

describe("getNextStep", () => {
  it("saute ARBRE_ESSENCE quand arbre_proximite n'est pas 'oui'", () => {
    expect(getNextStep(VulnerabiliteStep.ARBRE_PROXIMITE, SANS_ARBRE)).toBe(VulnerabiliteStep.HAIES);
    expect(getNextStep(VulnerabiliteStep.ARBRE_PROXIMITE, SANS_REPONSE)).toBe(VulnerabiliteStep.HAIES);
  });

  it("inclut ARBRE_ESSENCE quand arbre_proximite est 'oui'", () => {
    expect(getNextStep(VulnerabiliteStep.ARBRE_PROXIMITE, AVEC_ARBRE)).toBe(VulnerabiliteStep.ARBRE_ESSENCE);
    expect(getNextStep(VulnerabiliteStep.ARBRE_ESSENCE, AVEC_ARBRE)).toBe(VulnerabiliteStep.HAIES);
  });

  it("avance normalement sur les étapes non conditionnelles", () => {
    expect(getNextStep(VulnerabiliteStep.INTRO, SANS_REPONSE)).toBe(VulnerabiliteStep.ADRESSE);
    expect(getNextStep(VulnerabiliteStep.ADRESSE, SANS_REPONSE)).toBe(VulnerabiliteStep.PENTE_TERRAIN);
    expect(getNextStep(VulnerabiliteStep.ENSOLEILLEMENT, SANS_REPONSE)).toBe(VulnerabiliteStep.RESULTAT);
  });

  it("renvoie null après la dernière étape", () => {
    expect(getNextStep(VulnerabiliteStep.RESULTAT, SANS_REPONSE)).toBeNull();
  });
});

describe("getPreviousStep", () => {
  it("saute ARBRE_ESSENCE au retour arrière quand elle ne s'applique pas", () => {
    expect(getPreviousStep(VulnerabiliteStep.HAIES, SANS_ARBRE)).toBe(VulnerabiliteStep.ARBRE_PROXIMITE);
  });

  it("repasse par ARBRE_ESSENCE au retour arrière quand elle s'applique", () => {
    expect(getPreviousStep(VulnerabiliteStep.HAIES, AVEC_ARBRE)).toBe(VulnerabiliteStep.ARBRE_ESSENCE);
  });

  it("renvoie null avant la première étape", () => {
    expect(getPreviousStep(VulnerabiliteStep.INTRO, SANS_REPONSE)).toBeNull();
  });
});

describe("canGoToStep", () => {
  it("autorise à revenir en arrière ou rester sur place, jamais à avancer directement", () => {
    expect(canGoToStep(VulnerabiliteStep.ADRESSE, VulnerabiliteStep.HAIES)).toBe(true);
    expect(canGoToStep(VulnerabiliteStep.HAIES, VulnerabiliteStep.HAIES)).toBe(true);
    expect(canGoToStep(VulnerabiliteStep.RESULTAT, VulnerabiliteStep.HAIES)).toBe(false);
  });
});
