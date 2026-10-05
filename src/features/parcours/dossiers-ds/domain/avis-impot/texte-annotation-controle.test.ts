import { describe, it, expect } from "vitest";
import { controlerAvisImpot, STATUTS_CONTROLE, type ContexteControle } from "./controle-avis-impot";
import { masquerMontants, statutAnnotationControle, texteAnnotationControle } from "./texte-annotation-controle";
import { mapDossierAvisImpot } from "../../mappers/avis-impot.mapper";
import {
  FIXTURES_AVIS_IMPOT,
  dossierAvisFictif,
  pieceAvisFictive,
  type NomFixtureAvisImpot,
} from "../../mappers/avis-impot.fixtures";

const HORS_IDF: ContexteControle = { maintenant: new Date("2026-09-29T12:00:00Z") };

const COHERENT = "Les informations renseignées par le demandeur sont cohérentes avec l'avis d'imposition.";
const INCOHERENT =
  "Attention, il semble y avoir une incohérence entre les informations renseignées par le demandeur et l'avis d'imposition : montant déclaré = 30 000 € et montant indiqué dans l'avis d'imposition = 35 000 €.";
const IMPOSSIBLE =
  "La vérification automatique n'a pas pu être réalisée : l'avis d'imposition n'a pas pu être lu. Une vérification manuelle est nécessaire.";

const FOYER = {
  declarant1: "MARTIN CLAIRE",
  anneeRevenus: 2025,
  nombreParts: 1,
  dateMiseEnRecouvrement: "2026-07-31",
};

const resultat = (nom: NomFixtureAvisImpot) =>
  controlerAvisImpot(mapDossierAvisImpot(FIXTURES_AVIS_IMPOT[nom]), HORS_IDF);

describe("texteAnnotationControle", () => {
  it.each([
    ["lu", COHERENT],
    ["doublon", COHERENT],
    ["deux-foyers", COHERENT],
    ["ecart-revenu", INCOHERENT],
    ["non-lu", IMPOSSIBLE],
    ["sans-avis", IMPOSSIBLE],
  ] as const)("%s → une seule phrase, celle du métier", (nom, texte) => {
    expect(texteAnnotationControle(resultat(nom))).toBe(texte);
  });

  it("reste cohérente quand seul le foyer diffère : seul le RFR décide", () => {
    const dossier = dossierAvisFictif({
      nombrePersonnes: 6,
      revenuFiscalReference: 18500,
      dernierAvis: pieceAvisFictive({
        declarant1: "MARTIN CLAIRE",
        declarant2: "MARTIN PAUL",
        referenceAvis: "2600A00000001",
        anneeRevenus: 2025,
        nombreParts: 2.5,
        revenuFiscalReference: 18500,
        dateMiseEnRecouvrement: "2026-07-31",
      }),
    });
    const r = controlerAvisImpot(mapDossierAvisImpot(dossier), HORS_IDF);

    expect(r.statut).toBe(STATUTS_CONTROLE.A_VERIFIER);
    expect(statutAnnotationControle(r)).toBe(STATUTS_CONTROLE.COHERENT);
    expect(texteAnnotationControle(r)).toBe(COHERENT);
  });

  it("ne donne aucun montant quand le revenu concorde ou ne se vérifie pas", () => {
    for (const nom of ["lu", "non-lu", "sans-avis"] as const) {
      expect(texteAnnotationControle(resultat(nom))).not.toMatch(/\d/);
    }
  });

  it("masque les montants pour les sorties de scripts", () => {
    expect(masquerMontants(INCOHERENT)).toBe(
      "Attention, il semble y avoir une incohérence entre les informations renseignées par le demandeur et l'avis d'imposition : montant déclaré = *** € et montant indiqué dans l'avis d'imposition = *** €."
    );
    expect(masquerMontants(COHERENT)).toBe(COHERENT);
  });

  it("annonce une somme quand l'écart porte sur plusieurs avis", () => {
    const dossier = dossierAvisFictif({
      nombrePersonnes: 4,
      revenuFiscalReference: 25000,
      avisRepetes: [
        pieceAvisFictive({ ...FOYER, referenceAvis: "2600A00000001", revenuFiscalReference: 18500 }, { repetee: true }),
        pieceAvisFictive({ ...FOYER, referenceAvis: "2600A00000002", revenuFiscalReference: 9200 }, { repetee: true }),
      ],
    });

    expect(texteAnnotationControle(controlerAvisImpot(mapDossierAvisImpot(dossier), HORS_IDF))).toMatch(
      /: montant déclaré = 25 000 € et montant indiqué dans les avis d'imposition \(somme de 2 avis\) = 27 700 €\.$/
    );
  });
});
