import { describe, it, expect } from "vitest";
import contenuAccueil from "@/app/(main)/(home)/content/content.json";
import { SEUILS_HORS_IDF, SEUILS_IDF } from "@/features/simulateur/domain/types/rga-revenus.types";
import { TAUX_SUBVENTION, TYPES_MENAGE, calculerTrancheDossier, valeurTauxSubvention } from "./tranche-revenu";

const GERS = "32";
const PARIS = "75";

function calculer(revenu: number | null, personnes: number | null, departement: string | null = GERS) {
  return calculerTrancheDossier({
    revenuFiscalReference: revenu,
    nombrePersonnes: personnes,
    codeDepartement: departement,
  });
}

describe("calculerTrancheDossier", () => {
  const s = SEUILS_HORS_IDF[3];

  it.each([
    [s.tresModeste, TYPES_MENAGE.TMO, 90],
    [s.tresModeste + 1, TYPES_MENAGE.MO, 85],
    [s.modeste, TYPES_MENAGE.MO, 85],
    [s.modeste + 1, TYPES_MENAGE.INT, 70],
    [s.intermediaire, TYPES_MENAGE.INT, 70],
    [s.intermediaire + 1, TYPES_MENAGE.HORS_PLAFOND, null],
  ])("hors IdF, 3 personnes, RFR %i → %s (%s %)", (revenu, typeMenage, taux) => {
    expect(calculer(revenu, 3)).toEqual({ typeMenage, tauxSubvention: taux });
  });

  it("applique le barème IdF selon le département de la commune", () => {
    const revenu = SEUILS_IDF[1].tresModeste;

    expect(calculer(revenu, 1, PARIS).typeMenage).toBe(TYPES_MENAGE.TMO);
    expect(calculer(revenu, 1, GERS).typeMenage).toBe(TYPES_MENAGE.INT);
  });

  it("étend le barème au-delà de 5 personnes", () => {
    expect(calculer(SEUILS_HORS_IDF[5].tresModeste + 1000, 6).typeMenage).toBe(TYPES_MENAGE.TMO);
  });

  it.each([
    ["RFR absent", null, 3, GERS],
    ["personnes absentes", 18000, null, GERS],
    ["zéro personne", 18000, 0, GERS],
    ["commune absente", 18000, 3, null],
  ] as const)("est non calculable : %s", (_cas, revenu, personnes, departement) => {
    expect(calculer(revenu, personnes, departement)).toEqual({
      typeMenage: TYPES_MENAGE.NON_CALCULABLE,
      tauxSubvention: null,
    });
  });

  it("accepte un RFR nul, qui reste un ménage très modeste", () => {
    expect(calculer(0, 1).typeMenage).toBe(TYPES_MENAGE.TMO);
  });
});

describe("valeurTauxSubvention", () => {
  it.each([
    [{ typeMenage: TYPES_MENAGE.TMO, tauxSubvention: 90 }, 90],
    [{ typeMenage: TYPES_MENAGE.HORS_PLAFOND, tauxSubvention: null }, 0],
    [{ typeMenage: TYPES_MENAGE.NON_CALCULABLE, tauxSubvention: null }, null],
  ] as const)("%o → %s", (tranche, valeur) => {
    expect(valeurTauxSubvention(tranche)).toBe(valeur);
  });
});

describe("TAUX_SUBVENTION", () => {
  // La page d'accueil annonce ces taux au public : les deux sources ne doivent pas diverger.
  it.each(["Phase étude", "Phase travaux"])("reste aligné sur la ligne « %s » de la page d'accueil", (type) => {
    const tableau = JSON.stringify(contenuAccueil);
    const ligne = new RegExp(
      `"type":"${type}","tres_modeste":"(\\d+)%[^"]*","modeste":"(\\d+)%[^"]*","intermediaire":"(\\d+)%`
    ).exec(tableau);

    expect(ligne?.slice(1).map(Number)).toEqual([TAUX_SUBVENTION.TMO, TAUX_SUBVENTION.MO, TAUX_SUBVENTION.INT]);
  });
});
