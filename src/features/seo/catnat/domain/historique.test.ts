import { describe, expect, it } from "vitest";
import type { CatastropheNaturelle } from "@/shared/database/schema/catastrophes-naturelles";
import type { CatnatDecision } from "@/shared/database/schema/catnat-decisions";
import { fusionnerHistorique } from "./historique";

const arrete = (champs: Partial<CatastropheNaturelle> = {}): CatastropheNaturelle => ({
  codeNationalCatnat: "INTE2612297A",
  codeInsee: "36044",
  libelleCommune: "Châteauroux",
  libelleRisqueJo: "Sécheresse",
  dateDebutEvt: "2024-12-31",
  dateFinEvt: "2025-12-30",
  datePublicationArrete: "2026-05-10",
  datePublicationJo: "2026-05-13",
  createdAt: new Date(),
  updatedAt: new Date(),
  ...champs,
});

const decision = (champs: Partial<CatnatDecision> = {}): CatnatDecision => ({
  codeInsee: "36044",
  libelleCommune: "Châteauroux",
  dateArrete: "2026-05-11",
  datePublicationJo: "2026-05-14",
  dateDebutEvt: "2025-01-01",
  dateFinEvt: "2025-12-31",
  decision: "reconnue",
  motif: null,
  source: "data.gouv",
  createdAt: new Date(),
  updatedAt: new Date(),
  ...champs,
});

describe("fusionnerHistorique", () => {
  it("une reconnaissance connue des deux sources n'apparaît qu'une fois, avec le NOR et les dates du JO", () => {
    expect(fusionnerHistorique([arrete()], [decision()])).toEqual([
      {
        decision: "reconnue",
        codeNor: "INTE2612297A",
        dateDebut: "2025-01-01",
        dateFin: "2025-12-31",
        datePublicationJo: "2026-05-14",
        motif: null,
      },
    ]);
  });

  it("un arrêté sans décision correspondante garde les dates de Géorisques", () => {
    const [ligne] = fusionnerHistorique(
      [arrete({ dateDebutEvt: "2018-07-01", datePublicationArrete: "2019-06-18" })],
      []
    );

    expect(ligne).toMatchObject({ decision: "reconnue", codeNor: "INTE2612297A", dateDebut: "2018-07-01" });
  });

  it("une reconnaissance que Géorisques n'a pas encore s'affiche sans code NOR", () => {
    const lignes = fusionnerHistorique(
      [arrete()],
      [decision(), decision({ dateArrete: "2026-11-13", dateDebutEvt: "2026-01-01", dateFinEvt: "2026-12-31" })]
    );

    expect(lignes.map((ligne) => [ligne.dateDebut, ligne.codeNor])).toEqual([
      ["2026-01-01", null],
      ["2025-01-01", "INTE2612297A"],
    ]);
  });

  it("un refus s'ajoute toujours, avec son motif, même pour une période reconnue ensuite", () => {
    const refus = decision({
      decision: "non_reconnue",
      motif: "critère météorologique non satisfait",
      dateArrete: "2026-02-13",
      datePublicationJo: "2026-02-27",
    });

    const lignes = fusionnerHistorique([arrete()], [decision(), refus]);

    expect(lignes.map((ligne) => [ligne.decision, ligne.datePublicationJo, ligne.motif])).toEqual([
      ["reconnue", "2026-05-14", null],
      ["non_reconnue", "2026-02-27", "critère météorologique non satisfait"],
    ]);
  });

  it("un écart de plus d'un jour n'est pas un rapprochement", () => {
    const lignes = fusionnerHistorique([arrete({ dateDebutEvt: "2024-12-29" })], [decision()]);

    expect(lignes.map((ligne) => ligne.codeNor)).toEqual([null, "INTE2612297A"]);
  });

  it("deux périodes d'un même arrêté se rapprochent chacune de la sienne", () => {
    const lignes = fusionnerHistorique(
      [
        arrete({ dateDebutEvt: "2021-12-31", dateFinEvt: "2022-03-30" }),
        arrete({ dateDebutEvt: "2022-06-30", dateFinEvt: "2022-09-29" }),
      ],
      [
        decision({ dateDebutEvt: "2022-07-01", dateFinEvt: "2022-09-30" }),
        decision({ dateDebutEvt: "2022-01-01", dateFinEvt: "2022-03-31" }),
      ]
    );

    expect(lignes.map((ligne) => [ligne.dateDebut, ligne.dateFin, ligne.codeNor])).toEqual([
      ["2022-07-01", "2022-09-30", "INTE2612297A"],
      ["2022-01-01", "2022-03-31", "INTE2612297A"],
    ]);
  });

  it("trie de la période la plus récente à la plus ancienne", () => {
    const lignes = fusionnerHistorique(
      [arrete({ dateDebutEvt: "2011-04-01", datePublicationArrete: "2012-07-11" }), arrete()],
      [decision({ decision: "non_reconnue", dateArrete: "2025-09-16", dateDebutEvt: "2024-01-01" })]
    );

    expect(lignes.map((ligne) => ligne.dateDebut)).toEqual(["2024-12-31", "2024-01-01", "2011-04-01"]);
  });
});
