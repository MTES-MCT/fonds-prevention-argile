import { describe, it, expect } from "vitest";
import { controlerAvisImpot, type ContexteControle } from "./controle-avis-impot";
import { formaterDetailControle } from "./detail-controle-avis-impot";
import { mapDossierAvisImpot } from "../../mappers/avis-impot.mapper";
import {
  FIXTURES_AVIS_IMPOT,
  dossierAvisFictif,
  pieceAvisFictive,
  type NomFixtureAvisImpot,
} from "../../mappers/avis-impot.fixtures";

const HORS_IDF: ContexteControle = { codeRegion: "32", maintenant: new Date("2026-09-29T12:00:00Z") };

function detail(nom: NomFixtureAvisImpot, contexte: ContexteControle = HORS_IDF): string {
  return formaterDetailControle(controlerAvisImpot(mapDossierAvisImpot(FIXTURES_AVIS_IMPOT[nom]), contexte));
}

describe("formaterDetailControle", () => {
  it("détaille un contrôle cohérent, doublon compris", () => {
    expect(detail("doublon")).toBe(
      [
        "Contrôle automatique de l'avis d'imposition : Cohérent",
        "Avis lus : 1 sur 2 pièces déposées (1 doublon ignoré)",
        "Revenu fiscal de référence : cohérent (déclaré 18 500 €, avis 18 500 €)",
        "Personnes du ménage : cohérent (3 déclarées, 2,5 parts pour 2 déclarants : 3 estimées)",
        "Année des revenus : cohérente (2025)",
      ].join("\n")
    );
  });

  it("chiffre l'écart de revenu et son effet sur la tranche", () => {
    expect(detail("ecart-revenu")).toContain(
      "Revenu fiscal de référence : écart de +5 000 € (déclaré 30 000 €, avis 35 000 €) ; tranche très modeste → modeste"
    );
  });

  it("dit pourquoi la tranche manque sans région", () => {
    expect(detail("ecart-revenu", { ...HORS_IDF, codeRegion: null })).toContain(
      "tranche non calculée (région du logement inconnue)"
    );
  });

  it("renvoie à une vérification manuelle quand aucun 2D-Doc n'est lu", () => {
    expect(detail("non-lu")).toBe(
      [
        "Contrôle automatique de l'avis d'imposition : Non vérifiable",
        "Avis lus : 0 sur 1 pièce déposée, 1 non lu",
        "Aucun 2D-Doc lu (avis scanné, photographié ou sans code) : vérification manuelle.",
      ].join("\n")
    );
  });

  it("signale l'absence d'avis", () => {
    expect(detail("sans-avis")).toBe(
      "Contrôle automatique de l'avis d'imposition : Non vérifiable\nAucun avis d'imposition déposé."
    );
  });

  it("additionne parts et déclarants de plusieurs foyers", () => {
    expect(detail("deux-foyers")).toContain(
      "Personnes du ménage : cohérent (4 déclarées, 3,5 parts pour 3 déclarants : 4 estimées)"
    );
  });

  it("donne une fourchette pour un déclarant seul, parent isolé ou non", () => {
    const dossier = dossierAvisFictif({
      nombrePersonnes: 2,
      revenuFiscalReference: 9200,
      dernierAvis: pieceAvisFictive({
        declarant1: "DURAND LOUIS",
        referenceAvis: "2600A00000002",
        anneeRevenus: 2025,
        nombreParts: 2,
        revenuFiscalReference: 9200,
        dateMiseEnRecouvrement: "2026-07-31",
      }),
    });

    expect(formaterDetailControle(controlerAvisImpot(mapDossierAvisImpot(dossier), HORS_IDF))).toContain(
      "Personnes du ménage : cohérent (2 déclarées, 2 parts pour 1 déclarant : 2 à 3 estimées)"
    );
  });
});
