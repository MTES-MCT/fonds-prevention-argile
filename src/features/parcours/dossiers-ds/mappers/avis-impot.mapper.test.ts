import { describe, it, expect } from "vitest";
import { attributDeColonne, mapDossierAvisImpot } from "./avis-impot.mapper";
import { FIXTURES_AVIS_IMPOT, dossierAvisFictif, pieceAvisFictive } from "./avis-impot.fixtures";

describe("attributDeColonne", () => {
  it("lit l'attribut dans l'id d'une colonne réelle de DN", () => {
    expect(attributDeColonne(btoa("Column-type_de_champ/7014825-$.revenu_fiscal_de_reference"))).toBe(
      "revenu_fiscal_de_reference"
    );
  });

  it("renvoie null pour la colonne des fichiers, qui n'a pas d'attribut", () => {
    expect(attributDeColonne(btoa("Column-type_de_champ/5542794"))).toBeNull();
  });

  it("renvoie null pour un id qui n'est pas du base64", () => {
    expect(attributDeColonne("pas du base64 !")).toBeNull();
  });
});

describe("mapDossierAvisImpot", () => {
  it("lit les déclaratifs du foyer et un avis dont le 2D-Doc a été lu", () => {
    const donnees = mapDossierAvisImpot(FIXTURES_AVIS_IMPOT.lu);

    expect(donnees.declaratif).toEqual({ nombrePersonnes: 3, revenuFiscalReference: 18500 });
    expect(donnees.demarcheNumero).toBe(146377);
    expect(donnees.avis).toHaveLength(1);
    expect(donnees.avis[0]).toMatchObject({
      dansRepetition: false,
      nombreFichiers: 1,
      lu: true,
      declarant1: "MARTIN CLAIRE",
      declarant2: "MARTIN PAUL",
      referenceAvis: "2600A00000001",
      anneeRevenus: 2025,
      nombreParts: 2.5,
      revenuFiscalReference: 18500,
      dateMiseEnRecouvrement: "2026-07-31",
      attributsInconnus: [],
    });
  });

  it("remonte le même avis déposé dans les deux champs, le dédoublonnage revenant au contrôle", () => {
    const { avis } = mapDossierAvisImpot(FIXTURES_AVIS_IMPOT.doublon);

    expect(avis.map((a) => a.dansRepetition).sort()).toEqual([false, true]);
    expect(new Set(avis.map((a) => a.referenceAvis)).size).toBe(1);
  });

  it("lit chaque ligne du bloc répété", () => {
    const { avis } = mapDossierAvisImpot(FIXTURES_AVIS_IMPOT["deux-foyers"]);

    expect(avis.map((a) => a.revenuFiscalReference)).toEqual([18500, 9200]);
    expect(avis.every((a) => a.dansRepetition)).toBe(true);
  });

  it("marque non lu un avis déposé sans 2D-Doc exploitable", () => {
    const [avis] = mapDossierAvisImpot(FIXTURES_AVIS_IMPOT["non-lu"]).avis;

    expect(avis).toMatchObject({ nombreFichiers: 1, lu: false, revenuFiscalReference: null, nombreParts: null });
  });

  it("compte zéro fichier sur une pièce vide", () => {
    const [avis] = mapDossierAvisImpot(FIXTURES_AVIS_IMPOT["sans-avis"]).avis;

    expect(avis).toMatchObject({ nombreFichiers: 0, lu: false });
  });

  it("ignore les pièces d'une autre nature", () => {
    const { avis } = mapDossierAvisImpot(FIXTURES_AVIS_IMPOT.lu);

    expect(avis.every((a) => a.libelleChamp !== "RIB")).toBe(true);
  });

  it("lit les valeurs numériques depuis stringValue quand la valeur typée manque", () => {
    const piece = pieceAvisFictive({
      declarant1: "MARTIN CLAIRE",
      referenceAvis: "2600A00000001",
      anneeRevenus: 2025,
      nombreParts: 1.5,
      revenuFiscalReference: 12000,
      dateMiseEnRecouvrement: "2026-07-31",
    });
    for (const colonne of piece.columns) {
      delete colonne.valeurEntiere;
      delete colonne.valeurDecimale;
    }
    const parts = piece.columns.find((c) => c.label.endsWith("Nombre de parts"));
    if (parts) parts.stringValue = "1,5";

    const [avis] = mapDossierAvisImpot(
      dossierAvisFictif({ nombrePersonnes: 2, revenuFiscalReference: 12000, dernierAvis: piece })
    ).avis;

    expect(avis).toMatchObject({ revenuFiscalReference: 12000, anneeRevenus: 2025, nombreParts: 1.5 });
  });

  it("signale une colonne que DN ajouterait sans qu'on sache la lire", () => {
    const piece = pieceAvisFictive(null);
    piece.columns.push({
      __typename: "TextColumn",
      id: btoa("Column-type_de_champ/5542794-$.impot_revenu_net"),
      label: "Dernier avis d'imposition – Impôt net",
      stringValue: null,
    });

    const [avis] = mapDossierAvisImpot(
      dossierAvisFictif({ nombrePersonnes: 1, revenuFiscalReference: 1, dernierAvis: piece })
    ).avis;

    expect(avis.attributsInconnus).toEqual(["impot_revenu_net"]);
  });

  it("laisse les déclaratifs à null quand le demandeur ne les a pas saisis", () => {
    const donnees = mapDossierAvisImpot(dossierAvisFictif({ nombrePersonnes: null, revenuFiscalReference: null }));

    expect(donnees.declaratif).toEqual({ nombrePersonnes: null, revenuFiscalReference: null });
    expect(donnees.avis).toEqual([]);
  });
});
