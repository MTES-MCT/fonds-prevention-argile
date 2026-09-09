import { describe, it, expect } from "vitest";
import { DSStatus } from "@/shared/domain/value-objects/ds-status.enum";
import { peutModifierSaSimulation, raisonLectureSeule } from "./edition-simulation";

const libre = { simulationCorrigeeParAgent: false, eligibiliteDsStatus: null };

describe("peutModifierSaSimulation", () => {
  it("autorise l'édition tant que rien ne la verrouille", () => {
    expect(peutModifierSaSimulation(libre)).toBe(true);
    expect(raisonLectureSeule(libre)).toBeNull();
  });

  it("passe en lecture seule dès qu'un agent a corrigé la simulation", () => {
    const etat = { ...libre, simulationCorrigeeParAgent: true };

    expect(peutModifierSaSimulation(etat)).toBe(false);
    expect(raisonLectureSeule(etat)).toBe("correction_agent");
  });

  it("gèle l'édition entre le dépôt et la décision de la DDT", () => {
    for (const statut of [DSStatus.EN_CONSTRUCTION, DSStatus.EN_INSTRUCTION]) {
      expect(peutModifierSaSimulation({ ...libre, eligibiliteDsStatus: statut })).toBe(false);
      expect(raisonLectureSeule({ ...libre, eligibiliteDsStatus: statut })).toBe("dossier_chez_la_ddt");
    }
  });

  it("rouvre l'édition une fois la décision rendue", () => {
    for (const statut of [DSStatus.ACCEPTE, DSStatus.REFUSE, DSStatus.CLASSE_SANS_SUITE, DSStatus.NON_ACCESSIBLE]) {
      expect(peutModifierSaSimulation({ ...libre, eligibiliteDsStatus: statut })).toBe(true);
    }
  });

  it("fait primer la correction d'agent sur l'état du dossier", () => {
    const etat = { simulationCorrigeeParAgent: true, eligibiliteDsStatus: DSStatus.ACCEPTE };

    expect(raisonLectureSeule(etat)).toBe("correction_agent");
  });
});
