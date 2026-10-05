import { describe, it, expect } from "vitest";
import { controlerAvisImpot, STATUTS_CONTROLE, type ContexteControle } from "./controle-avis-impot";
import type { AvisImpotExtrait, DonneesAvisImpotDossier } from "./avis-impot.types";
import { mapDossierAvisImpot } from "../../mappers/avis-impot.mapper";
import { FIXTURES_AVIS_IMPOT } from "../../mappers/avis-impot.fixtures";

const { COHERENT, A_VERIFIER, NON_VERIFIABLE } = STATUTS_CONTROLE;
const HORS_IDF: ContexteControle = { maintenant: new Date("2026-09-29T12:00:00Z") };

function avis(valeurs: Partial<AvisImpotExtrait> = {}): AvisImpotExtrait {
  return {
    champDescriptorId: "Q2hhbXAtNTU0Mjc5NA==",
    libelleChamp: "Dernier avis d'imposition",
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
    ...valeurs,
  };
}

function repete(valeurs: Partial<AvisImpotExtrait> = {}): AvisImpotExtrait {
  return avis({
    champDescriptorId: "Q2hhbXAtNzAxNDgyNQ==",
    libelleChamp: "Avis d'imposition",
    dansRepetition: true,
    ...valeurs,
  });
}

function donnees(
  listeAvis: AvisImpotExtrait[],
  declaratif: Partial<DonneesAvisImpotDossier["declaratif"]> = {},
  codeDepartement: string | null = "32"
): Pick<DonneesAvisImpotDossier, "declaratif" | "avis" | "dateDepot" | "codeDepartement"> {
  return {
    declaratif: { nombrePersonnes: 3, revenuFiscalReference: 18500, ...declaratif },
    avis: listeAvis,
    dateDepot: "2026-09-29T15:41:02+02:00",
    codeDepartement,
  };
}

describe("controlerAvisImpot — fixtures", () => {
  it.each([
    ["lu", COHERENT],
    ["doublon", COHERENT],
    ["deux-foyers", COHERENT],
    ["ecart-revenu", A_VERIFIER],
    ["non-lu", NON_VERIFIABLE],
    ["sans-avis", NON_VERIFIABLE],
  ] as const)("%s → %s", (nom, statut) => {
    expect(controlerAvisImpot(mapDossierAvisImpot(FIXTURES_AVIS_IMPOT[nom]), HORS_IDF).statut).toBe(statut);
  });
});

describe("controlerAvisImpot — revenu fiscal de référence", () => {
  it("exige l'égalité stricte", () => {
    const { revenu, statut } = controlerAvisImpot(donnees([avis({ revenuFiscalReference: 18501 })]), HORS_IDF);

    expect(revenu).toMatchObject({ statut: A_VERIFIER, declare: 18500, avis: 18501, ecart: 1 });
    expect(statut).toBe(A_VERIFIER);
  });

  it("ne compte qu'une fois le même avis déposé sur deux lignes du bloc", () => {
    const resultat = controlerAvisImpot(donnees([repete(), repete()]), HORS_IDF);

    expect(resultat.revenu).toMatchObject({ statut: COHERENT, avis: 18500 });
    expect(resultat).toMatchObject({ avisDeposes: 2, avisLus: 1, doublonsIgnores: 1 });
  });

  it("retient le bloc répété et ignore « Dernier avis », même illisible", () => {
    const illisible = avis({ lu: false, referenceAvis: null, revenuFiscalReference: null });
    const resultat = controlerAvisImpot(donnees([illisible, repete()]), HORS_IDF);

    expect(resultat).toMatchObject({ source: "bloc_repete", avisDeposes: 1, avisNonLus: 0 });
    expect(resultat.revenu).toMatchObject({ statut: COHERENT, avis: 18500 });
  });

  it("n'ajoute pas un « Dernier avis » absent du bloc", () => {
    const autreAnnee = avis({ referenceAvis: "2500A00000009", revenuFiscalReference: 17000 });
    const { revenu } = controlerAvisImpot(donnees([autreAnnee, repete()]), HORS_IDF);

    expect(revenu).toMatchObject({ statut: COHERENT, avis: 18500 });
  });

  it("se rabat sur « Dernier avis » quand le bloc est vide", () => {
    const resultat = controlerAvisImpot(
      donnees([avis(), repete({ nombreFichiers: 0, lu: false, revenuFiscalReference: null })]),
      HORS_IDF
    );

    expect(resultat).toMatchObject({ source: "dernier_avis", avisDeposes: 1 });
    expect(resultat.revenu).toMatchObject({ statut: COHERENT, avis: 18500 });
  });

  it("reste non vérifiable quand une ligne du bloc est illisible", () => {
    const resultat = controlerAvisImpot(
      donnees([avis(), repete(), repete({ lu: false, referenceAvis: null, revenuFiscalReference: null })]),
      HORS_IDF
    );

    expect(resultat.revenu.statut).toBe(NON_VERIFIABLE);
  });

  it("additionne les avis de plusieurs foyers fiscaux", () => {
    const deuxFoyers = [
      avis(),
      avis({ referenceAvis: "2600A00000002", declarant2: null, nombreParts: 1, revenuFiscalReference: 9200 }),
    ];
    const { revenu } = controlerAvisImpot(
      donnees(deuxFoyers, { nombrePersonnes: 4, revenuFiscalReference: 27700 }),
      HORS_IDF
    );

    expect(revenu).toMatchObject({ statut: COHERENT, avis: 27700 });
  });

  it("calcule l'effet de l'écart sur la tranche (hors IdF, 3 personnes)", () => {
    const { revenu } = controlerAvisImpot(
      donnees([avis({ revenuFiscalReference: 35000 })], { revenuFiscalReference: 30000 }),
      HORS_IDF
    );

    expect(revenu).toMatchObject({ ecart: 5000, trancheDeclaree: "très modeste", trancheAvis: "modeste" });
  });

  it("signale un avis qui rend le ménage inéligible", () => {
    const { revenu } = controlerAvisImpot(donnees([avis({ revenuFiscalReference: 90000 })]), HORS_IDF);

    expect(revenu.trancheAvis).toBe("supérieure");
  });

  it("applique le barème IdF d'après le département de la commune", () => {
    const { revenu } = controlerAvisImpot(
      donnees([avis({ revenuFiscalReference: 35000 })], { revenuFiscalReference: 30000 }, "75"),
      HORS_IDF
    );

    expect(revenu).toMatchObject({ trancheDeclaree: "très modeste", trancheAvis: "très modeste" });
  });

  it("ne calcule pas de tranche sans commune", () => {
    const { revenu } = controlerAvisImpot(donnees([avis({ revenuFiscalReference: 35000 })], {}, null), HORS_IDF);

    expect(revenu).toMatchObject({ statut: A_VERIFIER, trancheDeclaree: null, trancheAvis: null });
  });

  it("ne somme pas quand un avis déposé n'a pas été lu", () => {
    const resultat = controlerAvisImpot(
      donnees([avis(), avis({ referenceAvis: null, lu: false, revenuFiscalReference: null, nombreParts: null })]),
      HORS_IDF
    );

    expect(resultat.revenu).toMatchObject({ statut: NON_VERIFIABLE, avis: null });
    expect(resultat).toMatchObject({ statut: A_VERIFIER, avisNonLus: 1 });
  });

  it("est non vérifiable quand le demandeur n'a pas déclaré son revenu", () => {
    const { revenu, statut } = controlerAvisImpot(donnees([avis()], { revenuFiscalReference: null }), HORS_IDF);

    expect(revenu.statut).toBe(NON_VERIFIABLE);
    expect(statut).toBe(A_VERIFIER);
  });
});

describe("controlerAvisImpot — personnes du ménage", () => {
  it.each([
    // [parts, déclarant 2 ?, personnes déclarées, statut attendu]
    [1, false, 1, COHERENT],
    [2, true, 2, COHERENT],
    [2.5, true, 3, COHERENT],
    [3, true, 4, COHERENT],
    [4, true, 5, COHERENT],
    [2, false, 2, COHERENT], // parent isolé, un enfant
    [2, false, 3, COHERENT], // célibataire, deux enfants
    [2.5, false, 3, COHERENT], // parent isolé, deux enfants
    [2.5, true, 2, A_VERIFIER],
    [2, true, 4, A_VERIFIER],
    [1, false, 3, A_VERIFIER],
  ] as const)("%s parts, couple %s, %s déclarées → %s", (parts, couple, personnes, statut) => {
    const { foyer } = controlerAvisImpot(
      donnees([avis({ nombreParts: parts, declarant2: couple ? "MARTIN PAUL" : null })], {
        nombrePersonnes: personnes,
      }),
      HORS_IDF
    );

    expect(foyer.statut).toBe(statut);
  });

  it("additionne parts, déclarants et estimations de plusieurs foyers", () => {
    const { foyer } = controlerAvisImpot(
      donnees([avis(), avis({ referenceAvis: "2600A00000002", declarant2: null, nombreParts: 1 })], {
        nombrePersonnes: 4,
      }),
      HORS_IDF
    );

    expect(foyer).toMatchObject({
      statut: COHERENT,
      nombreParts: 3.5,
      declarants: 3,
      estimationMin: 4,
      estimationMax: 4,
    });
  });

  it("est non vérifiable sans nombre de parts lu", () => {
    const { foyer } = controlerAvisImpot(donnees([avis({ nombreParts: null })]), HORS_IDF);

    expect(foyer.statut).toBe(NON_VERIFIABLE);
  });
});

describe("controlerAvisImpot — année des revenus", () => {
  it("attend les revenus de l'année précédant le dépôt", () => {
    expect(controlerAvisImpot(donnees([avis({ anneeRevenus: 2025 })]), HORS_IDF).annee).toEqual({
      statut: COHERENT,
      attendue: 2025,
      lues: [2025],
    });
  });

  it("refuse les revenus N-2", () => {
    const resultat = controlerAvisImpot(donnees([avis({ anneeRevenus: 2024 })]), HORS_IDF);

    expect(resultat.annee).toMatchObject({ statut: A_VERIFIER, lues: [2024] });
    expect(resultat.statut).toBe(A_VERIFIER);
  });

  it("lit l'année du dépôt, pas celle du contrôle", () => {
    const resultat = controlerAvisImpot(
      { ...donnees([avis({ anneeRevenus: 2025 })]), dateDepot: "2026-01-02T00:30:00+01:00" },
      { ...HORS_IDF, maintenant: new Date("2027-03-01T12:00:00Z") }
    );

    expect(resultat.annee.attendue).toBe(2025);
  });

  it("se rabat sur la date du contrôle sans date de dépôt", () => {
    const resultat = controlerAvisImpot({ ...donnees([avis()]), dateDepot: null }, HORS_IDF);

    expect(resultat.annee.attendue).toBe(2025);
  });
});

describe("controlerAvisImpot — couverture", () => {
  it("est non vérifiable sans aucune pièce déposée", () => {
    const resultat = controlerAvisImpot(donnees([avis({ nombreFichiers: 0, lu: false })]), HORS_IDF);

    expect(resultat).toMatchObject({ statut: NON_VERIFIABLE, avisDeposes: 0, avisLus: 0 });
  });

  it("est non vérifiable quand aucun 2D-Doc n'a été lu", () => {
    const resultat = controlerAvisImpot(
      donnees([
        avis({ lu: false, referenceAvis: null, revenuFiscalReference: null, nombreParts: null, anneeRevenus: null }),
      ]),
      HORS_IDF
    );

    expect(resultat).toMatchObject({ statut: NON_VERIFIABLE, avisDeposes: 1, avisLus: 0, avisNonLus: 1 });
  });
});
