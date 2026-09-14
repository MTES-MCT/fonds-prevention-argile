import { describe, it, expect } from "vitest";
import { DSStatus } from "@/shared/domain/value-objects/ds-status.enum";
import { peutModifierSaSimulation, raisonLectureSeule } from "./edition-simulation";

const libre = {
  simulationCorrigeeParAgent: false,
  decisionAmoRendue: false,
  eligibiliteDossierExiste: false,
  eligibiliteDsStatus: null,
};

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

  it("rouvre l'édition une fois la décision de la DDT rendue", () => {
    // Dossier bien présent : sans ce drapeau, le test passerait sans rien prouver.
    for (const statut of [DSStatus.ACCEPTE, DSStatus.REFUSE, DSStatus.CLASSE_SANS_SUITE]) {
      const etat = { ...libre, eligibiliteDossierExiste: true, eligibiliteDsStatus: statut };

      expect(peutModifierSaSimulation(etat)).toBe(true);
      expect(raisonLectureSeule(etat)).toBeNull();
    }
  });

  it("ferme l'édition dès que le formulaire DN est commencé, avant même son dépôt", () => {
    // Le préremplissage REST ne sait que créer : les réponses reportées dans le brouillon
    // ne sont plus corrigeables par l'application (retour de recette, septembre 2026).
    for (const statut of [null, DSStatus.NON_ACCESSIBLE]) {
      const etat = { ...libre, eligibiliteDossierExiste: true, eligibiliteDsStatus: statut };

      expect(peutModifierSaSimulation(etat)).toBe(false);
      expect(raisonLectureSeule(etat)).toBe("formulaire_dn_commence");
    }
  });

  it("laisse l'édition libre tant qu'aucun formulaire DN n'existe", () => {
    expect(peutModifierSaSimulation({ ...libre, eligibiliteDossierExiste: false })).toBe(true);
  });

  it("nomme le dépôt plutôt que le brouillon quand le dossier est chez la DDT", () => {
    const etat = { ...libre, eligibiliteDossierExiste: true, eligibiliteDsStatus: DSStatus.EN_INSTRUCTION };

    expect(raisonLectureSeule(etat)).toBe("dossier_chez_la_ddt");
  });

  it("passe en lecture seule dès que l'AMO a statué sur l'éligibilité", () => {
    const etat = { ...libre, decisionAmoRendue: true };

    expect(peutModifierSaSimulation(etat)).toBe(false);
    expect(raisonLectureSeule(etat)).toBe("decision_amo");
  });

  it("garde la décision de l'AMO devant l'état du dossier, qui lui se lève", () => {
    // Annoncer « vos informations redeviendront modifiables » serait faux : la décision
    // de l'AMO, elle, ne se lève pas toute seule.
    const etat = { ...libre, decisionAmoRendue: true, eligibiliteDsStatus: DSStatus.EN_INSTRUCTION };

    expect(raisonLectureSeule(etat)).toBe("decision_amo");
  });

  it("fait primer la correction d'agent sur l'état du dossier", () => {
    const etat = { ...libre, simulationCorrigeeParAgent: true, eligibiliteDsStatus: DSStatus.ACCEPTE };

    expect(raisonLectureSeule(etat)).toBe("correction_agent");
  });
});
