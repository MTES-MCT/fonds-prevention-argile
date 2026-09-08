import { describe, it, expect } from "vitest";
import { VulnerabiliteFlowService } from "./vulnerabilite-flow.service";
import { VulnerabiliteStep } from "../value-objects/vulnerabilite-step.enum";

describe("VulnerabiliteFlowService", () => {
  it("start() fait passer de INTRO à ADRESSE", () => {
    const state = VulnerabiliteFlowService.create();
    const started = VulnerabiliteFlowService.start(state);
    expect(started.currentStep).toBe(VulnerabiliteStep.ADRESSE);
    expect(started.history).toEqual([VulnerabiliteStep.INTRO]);
  });

  it("submitAnswer() fusionne les réponses et avance à l'étape suivante", () => {
    let state = VulnerabiliteFlowService.start(VulnerabiliteFlowService.create());
    state = VulnerabiliteFlowService.submitAnswer(state, {
      adresse: {
        label: "1 rue Test",
        communeNom: "Testville",
        codeDepartement: "81",
        coordonnees: "43.9,2.15",
        clefBan: "abc",
        rnb: "rnb-1",
        aleaRga: "moyen",
      },
    });
    expect(state.currentStep).toBe(VulnerabiliteStep.PENTE_TERRAIN);
    expect(state.answers.adresse?.aleaRga).toBe("moyen");
  });

  it("submitAnswer() saute ARBRE_ESSENCE si arbre_proximite = 'non'", () => {
    let state = VulnerabiliteFlowService.create();
    state = { ...state, currentStep: VulnerabiliteStep.ARBRE_PROXIMITE };
    state = VulnerabiliteFlowService.submitAnswer(state, { vegetation: { arbre_proximite: "non" } });
    expect(state.currentStep).toBe(VulnerabiliteStep.HAIES);
  });

  it("submitAnswer() inclut ARBRE_ESSENCE si arbre_proximite = 'oui'", () => {
    let state = VulnerabiliteFlowService.create();
    state = { ...state, currentStep: VulnerabiliteStep.ARBRE_PROXIMITE };
    state = VulnerabiliteFlowService.submitAnswer(state, { vegetation: { arbre_proximite: "oui" } });
    expect(state.currentStep).toBe(VulnerabiliteStep.ARBRE_ESSENCE);
  });

  it("submitAnswer() calcule le résultat en arrivant à RESULTAT", () => {
    let state = VulnerabiliteFlowService.create();
    state = { ...state, currentStep: VulnerabiliteStep.ENSOLEILLEMENT, history: [VulnerabiliteStep.MITOYENNETE] };
    state = VulnerabiliteFlowService.submitAnswer(state, { divers: { ensoleillement: "fort_sud" } });
    expect(state.currentStep).toBe(VulnerabiliteStep.RESULTAT);
    expect(state.result).not.toBeNull();
    expect(state.result?.scoreGlobal).toBeGreaterThan(0);
  });

  it("goBack() restaure l'étape précédente et efface la réponse de l'étape quittée (pas celle d'avant)", () => {
    let state = VulnerabiliteFlowService.create();
    state = { ...state, currentStep: VulnerabiliteStep.ADRESSE, history: [VulnerabiliteStep.INTRO] };
    state = VulnerabiliteFlowService.submitAnswer(state, {
      adresse: {
        label: "1 rue Test",
        communeNom: "Testville",
        codeDepartement: "81",
        coordonnees: "43.9,2.15",
        clefBan: "abc",
        rnb: "rnb-1",
        aleaRga: "moyen",
      },
    });
    expect(state.currentStep).toBe(VulnerabiliteStep.PENTE_TERRAIN);

    state = VulnerabiliteFlowService.submitAnswer(state, { eaux: { pente_terrain: "vers_facade" } });
    expect(state.currentStep).toBe(VulnerabiliteStep.RESEAUX_ENTERRES);

    // On quitte RESEAUX_ENTERRES (pas encore répondu) en revenant en arrière : rien à
    // effacer côté réseaux, mais on doit atterrir sur PENTE_TERRAIN avec sa réponse INTACTE
    // (goBack efface l'étape quittée, jamais celle sur laquelle on atterrit).
    state = VulnerabiliteFlowService.goBack(state);
    expect(state.currentStep).toBe(VulnerabiliteStep.PENTE_TERRAIN);
    expect(state.answers.eaux?.pente_terrain).toBe("vers_facade");
    expect(state.answers.adresse?.label).toBe("1 rue Test");

    // On revient encore : cette fois on quitte PENTE_TERRAIN, sa réponse doit être effacée.
    state = VulnerabiliteFlowService.goBack(state);
    expect(state.currentStep).toBe(VulnerabiliteStep.ADRESSE);
    expect(state.answers.eaux?.pente_terrain).toBeUndefined();
    expect(state.answers.adresse?.label).toBe("1 rue Test");
  });

  it("goBack() ne fait rien si l'historique est vide", () => {
    const state = VulnerabiliteFlowService.create();
    expect(VulnerabiliteFlowService.goBack(state)).toEqual(state);
  });

  it("canGoBack() est faux à l'intro, vrai ensuite", () => {
    const state = VulnerabiliteFlowService.create();
    expect(VulnerabiliteFlowService.canGoBack(state)).toBe(false);
    const started = VulnerabiliteFlowService.start(state);
    expect(VulnerabiliteFlowService.canGoBack(started)).toBe(true);
  });

  it("reset() revient à l'état initial", () => {
    const started = VulnerabiliteFlowService.start(VulnerabiliteFlowService.create());
    const reset = VulnerabiliteFlowService.reset();
    expect(reset.currentStep).toBe(VulnerabiliteStep.INTRO);
    expect(reset.history).toEqual([]);
    expect(started.currentStep).not.toBe(reset.currentStep);
  });
});
