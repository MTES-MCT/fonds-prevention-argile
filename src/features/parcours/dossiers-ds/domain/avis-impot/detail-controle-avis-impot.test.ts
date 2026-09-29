import { describe, it, expect } from "vitest";
import {
  controlerAvisImpot,
  STATUTS_CONTROLE,
  type ContexteControle,
  type ResultatControleAvisImpot,
} from "./controle-avis-impot";
import { LIMITE_ANNOTATION_CONTROLE, contenuSansDate, formaterDetailControle } from "./detail-controle-avis-impot";
import { mapDossierAvisImpot } from "../../mappers/avis-impot.mapper";
import {
  FIXTURES_AVIS_IMPOT,
  dossierAvisFictif,
  pieceAvisFictive,
  type NomFixtureAvisImpot,
} from "../../mappers/avis-impot.fixtures";

// 29/09 à 23h30 UTC = 30/09 à Paris : la date affichée est celle de Paris.
const MAINTENANT = new Date("2026-09-29T23:30:00Z");
const HORS_IDF: ContexteControle = { codeRegion: "32", maintenant: MAINTENANT };

function detail(nom: NomFixtureAvisImpot, contexte: ContexteControle = HORS_IDF): string {
  return formaterDetailControle(
    controlerAvisImpot(mapDossierAvisImpot(FIXTURES_AVIS_IMPOT[nom]), contexte),
    MAINTENANT
  );
}

describe("formaterDetailControle", () => {
  it("détaille un contrôle cohérent, doublon compris, daté à l'heure de Paris", () => {
    expect(detail("doublon")).toBe(
      [
        "Cohérent (contrôle automatique FPA du 30/09/2026)",
        "Avis lus : 1 sur 2 pièces, 1 doublon ignoré",
        "Revenu fiscal de référence : cohérent (déclaré 18 500 €, avis 18 500 €)",
        "Personnes du ménage : cohérent (3 déclarées, 2,5 parts pour 2 déclarants, soit 3 estimées)",
        "Année des revenus : cohérente (2025)",
      ].join("\n")
    );
  });

  it("chiffre l'écart de revenu et son effet sur la tranche", () => {
    expect(detail("ecart-revenu")).toContain(
      "Revenu fiscal de référence : écart de +5 000 € (déclaré 30 000 €, avis 35 000 €), tranche très modeste → modeste"
    );
  });

  it("dit pourquoi la tranche manque sans région", () => {
    expect(detail("ecart-revenu", { ...HORS_IDF, codeRegion: null })).toContain(
      "tranche non calculée (région inconnue)"
    );
  });

  it("renvoie à une vérification manuelle quand aucun 2D-Doc n'est lu", () => {
    expect(detail("non-lu")).toBe(
      [
        "Non vérifiable (contrôle automatique FPA du 30/09/2026)",
        "Avis lus : 0 sur 1 pièce, 1 non lu",
        "Aucun 2D-Doc lu (avis scanné, photographié ou sans code) : vérification manuelle.",
      ].join("\n")
    );
  });

  it("signale l'absence d'avis", () => {
    expect(detail("sans-avis")).toBe(
      "Non vérifiable (contrôle automatique FPA du 30/09/2026)\nAucun avis d'imposition déposé."
    );
  });

  it("additionne parts et déclarants de plusieurs foyers", () => {
    expect(detail("deux-foyers")).toContain(
      "Personnes du ménage : cohérent (4 déclarées, 3,5 parts pour 3 déclarants, soit 4 estimées)"
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

    expect(formaterDetailControle(controlerAvisImpot(mapDossierAvisImpot(dossier), HORS_IDF), MAINTENANT)).toContain(
      "Personnes du ménage : cohérent (2 déclarées, 2 parts pour 1 déclarant, soit 2 à 3 estimées)"
    );
  });

  it("tient dans la limite de l'annotation sans tronquer, même dans le pire cas", () => {
    const pireCas: ResultatControleAvisImpot = {
      statut: STATUTS_CONTROLE.NON_VERIFIABLE,
      avisDeposes: 12,
      avisLus: 10,
      avisNonLus: 11,
      doublonsIgnores: 11,
      revenu: {
        statut: STATUTS_CONTROLE.A_VERIFIER,
        declare: 1234567,
        avis: 12345678,
        ecart: -11111111,
        trancheDeclaree: "intermédiaire",
        trancheAvis: "très modeste",
      },
      foyer: {
        statut: STATUTS_CONTROLE.A_VERIFIER,
        declare: 12,
        nombreParts: 10.75,
        declarants: 14,
        estimationMin: 14,
        estimationMax: 22,
      },
      annee: { statut: STATUTS_CONTROLE.A_VERIFIER, attendue: 2025, lues: [2021, 2022, 2023, 2024] },
    };
    const texte = formaterDetailControle(pireCas, MAINTENANT);

    expect(texte.length).toBeLessThanOrEqual(LIMITE_ANNOTATION_CONTROLE);
    expect(texte.endsWith("…")).toBe(false);
  });
});

describe("contenuSansDate", () => {
  it("rend égaux deux contrôles identiques faits à des dates différentes", () => {
    const resultat = controlerAvisImpot(mapDossierAvisImpot(FIXTURES_AVIS_IMPOT.lu), HORS_IDF);

    expect(contenuSansDate(formaterDetailControle(resultat, new Date("2026-09-01T12:00:00Z")))).toBe(
      contenuSansDate(formaterDetailControle(resultat, MAINTENANT))
    );
  });

  it("accepte une annotation vide", () => {
    expect(contenuSansDate(null)).toBeNull();
  });
});
