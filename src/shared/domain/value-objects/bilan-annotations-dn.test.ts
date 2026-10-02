import { describe, it, expect } from "vitest";
import { ajouterAuBilanAnnotationsDn, bilanAnnotationsDnVide } from "./bilan-annotations-dn";

describe("ajouterAuBilanAnnotationsDn", () => {
  it("compte un contrôle qui a écrit deux annotations", () => {
    const bilan = ajouterAuBilanAnnotationsDn(
      bilanAnnotationsDnVide(),
      { issue: "ecrite", annotationsEcrites: ["avisImpot", "tauxSubvention"] },
      "a_verifier"
    );

    expect(bilan).toEqual({
      controles: 1,
      ecritures: { avisImpot: 1, typeMenage: 0, tauxSubvention: 1 },
      aJour: 0,
      echecs: 0,
      verdicts: { coherent: 0, a_verifier: 1, non_verifiable: 0 },
    });
  });

  it("additionne les contrôles d'un run, échec compris, sans verdict pour un échec", () => {
    let bilan = bilanAnnotationsDnVide();
    bilan = ajouterAuBilanAnnotationsDn(bilan, { issue: "ecrite", annotationsEcrites: ["typeMenage"] }, "coherent");
    bilan = ajouterAuBilanAnnotationsDn(bilan, { issue: "inchangee", annotationsEcrites: [] }, "coherent");
    bilan = ajouterAuBilanAnnotationsDn(bilan, { issue: "echec", annotationsEcrites: [] }, null);

    expect(bilan).toMatchObject({
      controles: 3,
      ecritures: { avisImpot: 0, typeMenage: 1, tauxSubvention: 0 },
      aJour: 1,
      echecs: 1,
      verdicts: { coherent: 2, a_verifier: 0, non_verifiable: 0 },
    });
  });

  it("ne modifie pas le bilan reçu", () => {
    const vide = bilanAnnotationsDnVide();

    ajouterAuBilanAnnotationsDn(vide, { issue: "ecrite", annotationsEcrites: ["avisImpot"] }, "coherent");

    expect(vide).toEqual(bilanAnnotationsDnVide());
  });
});
