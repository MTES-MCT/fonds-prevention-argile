import { describe, expect, it } from "vitest";
import { comparerSources, compterEpisodesReconnus, debutComparaison } from "./comparaison-sources";
import type { ArreteGeorisques, DecisionPubliee } from "./rapprochement";

const arrete = (champs: Partial<ArreteGeorisques> = {}): ArreteGeorisques => ({
  codeNationalCatnat: "INTE2630374A",
  codeInsee: "36044",
  dateDebutEvt: "2026-01-01",
  dateFinEvt: "2026-12-31",
  datePublicationArrete: "2026-11-13",
  datePublicationJo: "2026-11-21",
  ...champs,
});

const decision = (champs: Partial<DecisionPubliee> = {}): DecisionPubliee => ({
  codeInsee: "36044",
  dateArrete: "2026-11-13",
  dateDebutEvt: "2026-01-01",
  dateFinEvt: "2026-12-31",
  datePublicationJo: "2026-11-21",
  decision: "reconnue",
  motif: null,
  ...champs,
});

// Le jeu data.gouv commence par un refus paru le 15 juillet 2025.
const premierRefus = decision({
  codeInsee: "54395",
  decision: "non_reconnue",
  dateArrete: "2025-07-10",
  dateDebutEvt: "2024-01-01",
  dateFinEvt: "2024-12-31",
  datePublicationJo: "2025-07-15",
});

describe("comparerSources", () => {
  it("classe chaque reconnaissance : identique, à un jour d'écart, ou connue d'une seule source", () => {
    const decale = { dateArrete: "2026-05-11", dateDebutEvt: "2025-01-01", dateFinEvt: "2025-12-31" };

    const comparaison = comparerSources(
      [
        arrete(),
        arrete({
          codeNationalCatnat: "INTE2612297A",
          codeInsee: "36211",
          dateDebutEvt: "2024-12-31",
          dateFinEvt: "2025-12-30",
          datePublicationArrete: "2026-05-10",
          datePublicationJo: "2026-05-13",
        }),
        arrete({ codeNationalCatnat: "INTE2527885A", codeInsee: "24294", dateDebutEvt: "2025-02-14" }),
      ],
      [
        premierRefus,
        decision(),
        decision({ ...decale, codeInsee: "36211", datePublicationJo: "2026-05-14" }),
        decision({ codeInsee: "04158", dateArrete: "2025-10-16", dateDebutEvt: "2023-04-01" }),
      ]
    );

    expect(comparaison).toMatchObject({ identiques: 1, ecartUnJour: 1, georisquesSeul: 1, datagouvSeul: 1 });
  });

  it("ne compare pas ce que Géorisques a publié avant le début du jeu data.gouv", () => {
    const ancien = arrete({
      codeNationalCatnat: "INTE2014522A",
      dateDebutEvt: "2019-07-01",
      datePublicationJo: "2020-07-10",
    });

    expect(comparerSources([ancien, arrete()], [premierRefus, decision()])).toMatchObject({
      identiques: 1,
      georisquesSeul: 0,
    });
  });

  it("deux sources au même JO, ou à un jour près : aucune n'est en retard", () => {
    const comparaison = comparerSources([arrete({ datePublicationJo: "2026-11-20" })], [premierRefus, decision()]);

    expect(comparaison).toMatchObject({
      dernierJoGeorisques: "2026-11-20",
      dernierJoDatagouv: "2026-11-21",
      sourceEnRetard: null,
      retardJours: 0,
    });
  });

  it("Géorisques resté à l'arrêté précédent, cinq jours après la parution : pas encore un retard", () => {
    const precedent = arrete({
      codeNationalCatnat: "INTE2627286A",
      datePublicationArrete: "2026-11-08",
      datePublicationJo: "2026-11-16",
    });

    expect(comparerSources([precedent], [premierRefus, decision()])).toMatchObject({
      sourceEnRetard: null,
      retardJours: 5,
    });
  });

  it("Géorisques à plus de 15 jours derrière data.gouv → signalé en retard", () => {
    const precedent = arrete({
      codeNationalCatnat: "INTE2627286A",
      datePublicationArrete: "2026-10-16",
      datePublicationJo: "2026-10-23",
    });

    expect(comparerSources([precedent], [premierRefus, decision()])).toMatchObject({
      sourceEnRetard: "georisques",
      retardJours: 29,
    });
  });

  it("data.gouv figé pendant que Géorisques avance → c'est lui qui est signalé", () => {
    const figee = decision({ dateArrete: "2026-09-11", datePublicationJo: "2026-09-22", dateDebutEvt: "2025-01-01" });

    expect(comparerSources([arrete()], [premierRefus, figee])).toMatchObject({
      sourceEnRetard: "data.gouv",
      retardJours: 60,
    });
  });

  it("jeu data.gouv vide : rien à comparer", () => {
    expect(comparerSources([arrete()], [])).toMatchObject({
      identiques: 0,
      georisquesSeul: 0,
      dernierJoDatagouv: null,
      sourceEnRetard: null,
    });
  });
});

describe("debutComparaison", () => {
  it("la veille de la première parution du jeu data.gouv, refus compris", () => {
    expect(debutComparaison([decision(), premierRefus])).toBe("2025-07-14");
  });

  it("jeu vide → aucune période", () => {
    expect(debutComparaison([])).toBeNull();
  });
});

describe("compterEpisodesReconnus", () => {
  const arretes = [
    { codeNationalCatnat: "INTE2014522A", datePublicationArrete: "2020-06-16" },
    { codeNationalCatnat: "INTE2612297A", datePublicationArrete: "2026-05-10" },
  ];

  it("compte chaque arrêté de Géorisques une fois, même vu de plusieurs communes", () => {
    expect(compterEpisodesReconnus([...arretes, arretes[0]], [])).toBe(2);
  });

  it("n'ajoute pas un arrêté que Géorisques connaît déjà, daté un jour plus tôt", () => {
    expect(compterEpisodesReconnus(arretes, ["2026-05-11"])).toBe(2);
  });

  it("ajoute l'arrêté que seul le jeu data.gouv connaît, une seule fois", () => {
    expect(compterEpisodesReconnus(arretes, ["2026-05-11", "2026-11-13", "2026-11-13"])).toBe(3);
  });

  it("territoire connu de data.gouv seulement", () => {
    expect(compterEpisodesReconnus([], ["2026-11-13"])).toBe(1);
  });
});
