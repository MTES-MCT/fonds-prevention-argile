import { describe, it, expect } from "vitest";
import { ajouterAuBilanAnnotationsDn, ajouterChorusAuBilan, bilanAnnotationsDnVide } from "./bilan-annotations-dn";

describe("ajouterAuBilanAnnotationsDn", () => {
  it("compte un contrôle qui a écrit deux annotations", () => {
    const bilan = ajouterAuBilanAnnotationsDn(
      bilanAnnotationsDnVide(),
      { issue: "ecrite", annotationsEcrites: ["avisImpot", "tauxSubvention"] },
      "a_verifier"
    );

    expect(bilan).toEqual({
      controles: 1,
      ecritures: { avisImpot: 1, typeMenage: 0, tauxSubvention: 1, lienCarte: 0, zoneAlea: 0, lienFpa: 0 },
      aJour: 0,
      echecs: 0,
      echecsLienFpa: 0,
      adressesNonGeocodees: 0,
      verdicts: { coherent: 0, a_verifier: 1, non_verifiable: 0 },
      chorus: {
        lus: 0,
        statuts: {
          tiersFournisseur: { reporte: 0, inchange: 0, absent: 0 },
          numeroEj: { reporte: 0, inchange: 0, absent: 0 },
          montantSubvention: { reporte: 0, inchange: 0, absent: 0 },
        },
        echecs: 0,
      },
    });
  });

  it("compte, pour chaque valeur Chorus, les dossiers reportés, inchangés ou absents de DN", () => {
    let bilan = bilanAnnotationsDnVide();
    bilan = ajouterChorusAuBilan(
      bilan,
      { tiersFournisseur: "reporte", numeroEj: "absent", montantSubvention: "absent" },
      false
    );
    bilan = ajouterChorusAuBilan(
      bilan,
      { tiersFournisseur: "inchange", numeroEj: "reporte", montantSubvention: "absent" },
      false
    );
    bilan = ajouterChorusAuBilan(bilan, null, true);
    bilan = ajouterChorusAuBilan(bilan, null, false);

    expect(bilan.controles).toBe(0);
    expect(bilan.chorus).toEqual({
      lus: 2,
      statuts: {
        tiersFournisseur: { reporte: 1, inchange: 1, absent: 0 },
        numeroEj: { reporte: 1, inchange: 0, absent: 1 },
        montantSubvention: { reporte: 0, inchange: 0, absent: 2 },
      },
      echecs: 1,
    });
  });

  it("accepte un bilan enregistré avant le suivi Chorus", () => {
    const { chorus: _chorus, ...ancien } = bilanAnnotationsDnVide();
    const bilan = ajouterChorusAuBilan(
      ancien,
      { tiersFournisseur: "absent", numeroEj: "absent", montantSubvention: "reporte" },
      false
    );

    expect(bilan.chorus?.statuts.montantSubvention.reporte).toBe(1);
  });

  it("additionne les contrôles d'un run, échec compris, sans verdict pour un échec", () => {
    let bilan = bilanAnnotationsDnVide();
    bilan = ajouterAuBilanAnnotationsDn(bilan, { issue: "ecrite", annotationsEcrites: ["typeMenage"] }, "coherent");
    bilan = ajouterAuBilanAnnotationsDn(bilan, { issue: "inchangee", annotationsEcrites: [] }, "coherent");
    bilan = ajouterAuBilanAnnotationsDn(bilan, { issue: "echec", annotationsEcrites: [] }, null);

    expect(bilan).toMatchObject({
      controles: 3,
      ecritures: { avisImpot: 0, typeMenage: 1, tauxSubvention: 0, lienCarte: 0, zoneAlea: 0, lienFpa: 0 },
      aJour: 1,
      echecs: 1,
      verdicts: { coherent: 2, a_verifier: 0, non_verifiable: 0 },
    });
  });

  it("compte le lien FPA à part, sans en faire un contrôle", () => {
    let bilan = bilanAnnotationsDnVide();
    bilan = ajouterAuBilanAnnotationsDn(bilan, { issue: null, annotationsEcrites: ["lienFpa", "lienFpa"] }, null);
    bilan = ajouterAuBilanAnnotationsDn(bilan, { issue: null, annotationsEcrites: [], echecLienFpa: true }, null);
    bilan = ajouterAuBilanAnnotationsDn(bilan, { issue: "inchangee", annotationsEcrites: ["lienFpa"] }, "coherent");

    expect(bilan).toMatchObject({
      controles: 1,
      ecritures: { avisImpot: 0, typeMenage: 0, tauxSubvention: 0, lienCarte: 0, zoneAlea: 0, lienFpa: 3 },
      aJour: 1,
      echecs: 0,
      echecsLienFpa: 1,
    });
  });

  it("ne modifie pas le bilan reçu", () => {
    const vide = bilanAnnotationsDnVide();

    ajouterAuBilanAnnotationsDn(vide, { issue: "ecrite", annotationsEcrites: ["avisImpot"] }, "coherent");

    expect(vide).toEqual(bilanAnnotationsDnVide());
  });
});
