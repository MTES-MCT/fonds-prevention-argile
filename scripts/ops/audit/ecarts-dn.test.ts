import { describe, it, expect } from "vitest";
import {
  analyserEcarts,
  etatDnVersDsStatus,
  fenetreValides,
  type DossierDn,
  type PointeurBase,
  type TentativeBase,
} from "./ecarts-dn";

const DEBUT = new Date("2025-10-16T00:00:00Z");
const MAINTENANT = new Date("2026-10-06T08:00:00Z");
const HIER = new Date("2026-10-05T22:00:00Z");

function dn(numero: string, surcharge: Partial<DossierDn> = {}): DossierDn {
  return {
    numero,
    etat: "en_construction",
    archive: false,
    prerempli: true,
    dateTraitement: null,
    parcoursIdAnnote: null,
    annotationDouteuse: false,
    ...surcharge,
  };
}

function pointeur(numero: string, surcharge: Partial<PointeurBase> = {}): PointeurBase {
  return {
    numero,
    parcoursId: `p-${numero}`,
    dsStatus: "en_construction",
    submittedAt: new Date("2026-03-01T00:00:00Z"),
    processedAt: null,
    lastSyncAt: HIER,
    parcoursArchive: false,
    parcoursComplete: false,
    syncEnErreur: false,
    ...surcharge,
  };
}

function analyser(params: {
  dn?: DossierDn[];
  pointeurs?: PointeurBase[];
  tentatives?: TentativeBase[];
  parcoursExistants?: string[];
  supprimes?: Parameters<typeof analyserEcarts>[0]["supprimes"];
}) {
  return analyserEcarts({
    dn: params.dn ?? [],
    supprimes: params.supprimes ?? [],
    pointeurs: params.pointeurs ?? [],
    tentatives: params.tentatives ?? [],
    parcoursExistants: new Set(params.parcoursExistants ?? []),
    maintenant: MAINTENANT,
    debutService: DEBUT,
  });
}

describe("etatDnVersDsStatus", () => {
  it("traduit sans_suite, seul état dont le libellé diffère en base", () => {
    expect(etatDnVersDsStatus("sans_suite")).toBe("classe_sans_suite");
    expect(etatDnVersDsStatus("accepte")).toBe("accepte");
  });
});

describe("fenetreValides", () => {
  it("s'arrête au 1er du mois en cours, comme le graphique de /stats", () => {
    expect(fenetreValides(MAINTENANT, DEBUT).fin.toISOString()).toBe("2026-10-01T00:00:00.000Z");
  });
});

describe("analyserEcarts — périmètre des déposés", () => {
  it("compte un dossier pointé et déposé", () => {
    const r = analyser({ dn: [dn("1")], pointeurs: [pointeur("1")] });
    expect(r.deposes.parPerimetre.compte).toEqual(["1"]);
    expect(r.deposes.residu).toBe(0);
  });

  it("isole un pointeur dont le dépôt n'a jamais été enregistré", () => {
    const r = analyser({ dn: [dn("1")], pointeurs: [pointeur("1", { submittedAt: null, dsStatus: null })] });
    expect(r.deposes.parPerimetre.pointeur_sans_depot).toEqual(["1"]);
  });

  it("distingue un numéro du registre doublon d'un numéro remplacé", () => {
    const r = analyser({
      dn: [dn("10"), dn("20")],
      pointeurs: [pointeur("11", { parcoursId: "a" }), pointeur("21", { parcoursId: "b", submittedAt: null })],
      tentatives: [
        { numero: "10", parcoursId: "a" },
        { numero: "20", parcoursId: "b" },
      ],
    });
    expect(r.deposes.parPerimetre.registre_doublon).toEqual(["10"]);
    expect(r.deposes.parPerimetre.registre_remplace).toEqual(["20"]);
  });

  it("ne range pas au registre un numéro encore pointé", () => {
    const r = analyser({
      dn: [dn("1")],
      pointeurs: [pointeur("1")],
      tentatives: [{ numero: "1", parcoursId: "p-1" }],
    });
    expect(r.deposes.parPerimetre.compte).toEqual(["1"]);
  });

  it("classe les inconnus selon leur lien FPA", () => {
    const r = analyser({
      dn: [
        dn("1", { prerempli: false }),
        dn("6"),
        dn("2", { parcoursIdAnnote: "disparu" }),
        dn("3", { parcoursIdAnnote: "a" }),
        dn("4", { parcoursIdAnnote: "b" }),
        dn("5", { annotationDouteuse: true }),
      ],
      pointeurs: [pointeur("9", { parcoursId: "a" })],
      parcoursExistants: ["a", "b"],
    });
    expect(r.deposes.parPerimetre.hors_fpa).toEqual(["1"]);
    expect(r.deposes.parPerimetre.prerempli_sans_lien).toEqual(["6"]);
    expect(r.deposes.parPerimetre.parcours_supprime).toEqual(["2"]);
    expect(r.deposes.parPerimetre.annote_doublon).toEqual(["3"]);
    expect(r.deposes.parPerimetre.annote_pointeur_perdu).toEqual(["4"]);
    expect(r.deposes.parPerimetre.annotation_douteuse).toEqual(["5"]);
  });

  it("relève un dossier compté que DN ne liste plus, avec la raison de suppression", () => {
    const r = analyser({
      pointeurs: [pointeur("1"), pointeur("2"), pointeur("3")],
      supprimes: [
        { numero: "1", raison: "expired", enCorbeille: false },
        { numero: "2", raison: "user_request", enCorbeille: true },
      ],
    });
    expect(r.deposes.fantomes.map((f) => [f.numero, f.cause, f.raison])).toEqual([
      ["1", "supprime_dn", "expired"],
      ["2", "corbeille_dn", "user_request"],
      ["3", "introuvable", null],
    ]);
    expect(r.deposes.residu).toBe(0);
  });
});

describe("analyserEcarts — divergences d'état", () => {
  it("attribue la divergence à l'archivage avant toute autre cause", () => {
    const r = analyser({
      dn: [dn("1", { etat: "accepte" })],
      pointeurs: [pointeur("1", { parcoursArchive: true, syncEnErreur: true })],
    });
    expect(r.divergences).toEqual([
      { numero: "1", etatDn: "accepte", dsStatus: "en_construction", cause: "parcours_archive" },
    ]);
  });

  it("signale un sans_suite que la synchro ne sait pas écrire", () => {
    const r = analyser({
      dn: [dn("1", { etat: "sans_suite" })],
      pointeurs: [pointeur("1", { dsStatus: "en_instruction", syncEnErreur: true })],
    });
    expect(r.divergences[0].cause).toBe("etat_inconnu_en_base");
  });

  it("ne voit pas de divergence entre sans_suite et classe_sans_suite", () => {
    const r = analyser({
      dn: [dn("1", { etat: "sans_suite" })],
      pointeurs: [pointeur("1", { dsStatus: "classe_sans_suite" })],
    });
    expect(r.divergences).toEqual([]);
  });

  it("repère une synchro ancienne", () => {
    const r = analyser({
      dn: [dn("1", { etat: "en_instruction" })],
      pointeurs: [pointeur("1", { lastSyncAt: new Date("2026-09-01T00:00:00Z") })],
    });
    expect(r.divergences[0].cause).toBe("sync_ancienne");
  });

  it("relève une date de décision différente de plus d'un jour", () => {
    const r = analyser({
      dn: [dn("1", { etat: "accepte", dateTraitement: new Date("2026-05-10T00:00:00Z") })],
      pointeurs: [pointeur("1", { dsStatus: "accepte", processedAt: new Date("2026-05-20T00:00:00Z") })],
    });
    expect(r.datesDivergentes.map((d) => d.numero)).toEqual(["1"]);
  });
});

describe("analyserEcarts — validés", () => {
  it("explique chaque accepté DN absent du graphique", () => {
    const r = analyser({
      dn: [
        dn("1", { etat: "accepte" }),
        dn("2", { etat: "accepte" }),
        dn("3", { etat: "accepte" }),
        dn("4", { etat: "accepte" }),
        dn("5", { etat: "accepte" }),
      ],
      pointeurs: [
        pointeur("1", { dsStatus: "accepte", processedAt: new Date("2026-06-01T00:00:00Z") }),
        pointeur("2", { dsStatus: "accepte", processedAt: new Date("2026-10-02T00:00:00Z") }),
        pointeur("3", { dsStatus: "accepte", processedAt: null }),
        pointeur("4", { dsStatus: "en_instruction" }),
      ],
    });
    expect(r.base.valides).toBe(1);
    expect(r.valides.absents.decision_mois_en_cours).toEqual(["2"]);
    expect(r.valides.absents.decision_hors_periode).toEqual(["3"]);
    expect(r.valides.absents.etat_divergent).toEqual(["4"]);
    expect(r.valides.absents.hors_perimetre).toEqual(["5"]);
    expect(r.valides.residu).toBe(0);
  });

  it("relève un validé en base que DN ne dit pas accepté", () => {
    const r = analyser({
      dn: [dn("1", { etat: "refuse" })],
      pointeurs: [
        pointeur("1", { dsStatus: "accepte", processedAt: new Date("2026-06-01T00:00:00Z") }),
        pointeur("2", { dsStatus: "accepte", processedAt: new Date("2026-06-01T00:00:00Z") }),
      ],
    });
    expect(r.valides.enTrop).toEqual(["1", "2"]);
    expect(r.valides.residu).toBe(0);
  });
});
