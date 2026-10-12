import { describe, it, expect } from "vitest";
import {
  analyserEcarts,
  derniereErreurParNumero,
  erreurSyncEnCours,
  ErreurCollecte,
  extraireConnexion,
  fenetreValides,
  messageSur,
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

function pointeur(numero: string | null, surcharge: Partial<PointeurBase> = {}): PointeurBase {
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

describe("fenetreValides", () => {
  it("inclut le lancement et exclut le 1er du mois en cours, à la milliseconde", () => {
    const { debut, fin } = fenetreValides(MAINTENANT, DEBUT);
    const dans = (date: string) => new Date(date) >= debut && new Date(date) < fin;
    expect(dans("2025-10-16T00:00:00.000Z")).toBe(true);
    expect(dans("2025-10-15T23:59:59.999Z")).toBe(false);
    expect(dans("2026-09-30T23:59:59.999Z")).toBe(true);
    expect(dans("2026-10-01T00:00:00.000Z")).toBe(false);
  });

  it("change de mois à minuit UTC, quel que soit le fuseau du poste", () => {
    const veille = fenetreValides(new Date("2026-09-30T22:30:00Z"), DEBUT).fin.toISOString();
    const lendemain = fenetreValides(new Date("2026-10-01T00:00:00Z"), DEBUT).fin.toISOString();
    expect(veille).toBe("2026-09-01T00:00:00.000Z");
    expect(lendemain).toBe("2026-10-01T00:00:00.000Z");
  });

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

  it("signale un classé sans suite jamais recopié, même sur un parcours archivé", () => {
    const r = analyser({
      dn: [dn("1", { etat: "sans_suite" })],
      pointeurs: [pointeur("1", { dsStatus: "en_instruction", parcoursArchive: true })],
    });
    expect(r.divergences[0].cause).toBe("sans_suite_non_recopie");
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

describe("analyserEcarts — pointeurs sans numéro DN", () => {
  it("compte la ligne comme /stats et la relève comme fantôme, sans que le bilan se referme à tort", () => {
    const r = analyser({
      dn: [dn("1")],
      pointeurs: [pointeur("1"), pointeur(null, { parcoursId: "orphelin" })],
    });
    expect(r.base.deposes).toBe(2);
    expect(r.deposes.fantomes).toEqual([
      { numero: "parcours:orphelin", dsStatus: "en_construction", cause: "sans_numero", raison: null },
    ]);
    expect(r.deposes.residu).toBe(0);
  });

  it("garde dans le graphique un validé sans numéro, signalé comme à vérifier", () => {
    const r = analyser({
      pointeurs: [
        pointeur("x", {
          numero: null,
          parcoursId: "orphelin",
          dsStatus: "accepte",
          processedAt: new Date("2026-06-01"),
        }),
      ],
    });
    expect(r.base.valides).toBe(1);
    expect(r.valides.enTrop).toEqual(["parcours:orphelin"]);
    expect(r.valides.residu).toBe(0);
  });
});

describe("erreurSyncEnCours", () => {
  it("n'est plus d'actualité après une lecture réussie plus récente", () => {
    expect(erreurSyncEnCours(new Date("2026-09-01"), new Date("2026-09-20"))).toBe(false);
  });

  it("l'est quand l'erreur est postérieure à la dernière lecture, ou sans lecture", () => {
    expect(erreurSyncEnCours(new Date("2026-09-25"), new Date("2026-09-20"))).toBe(true);
    expect(erreurSyncEnCours(new Date("2026-09-25"), null)).toBe(true);
  });

  it("est faux sans erreur", () => {
    expect(erreurSyncEnCours(undefined, null)).toBe(false);
  });
});

describe("derniereErreurParNumero", () => {
  it("garde la plus récente par numéro et ignore les autres étapes", () => {
    const parNumero = derniereErreurParNumero(
      [
        { error: "eligibilite: Sync dossier 11 échouée: x", createdAt: new Date("2026-09-01") },
        { error: "eligibilite: Sync dossier 11 échouée: y", createdAt: new Date("2026-09-10") },
        { error: "diagnostic: Sync dossier 22 échouée: z", createdAt: new Date("2026-09-05") },
        { error: null, createdAt: new Date("2026-09-06") },
      ],
      "eligibilite"
    );
    expect([...parNumero.entries()]).toEqual([["11", new Date("2026-09-10")]]);
  });

  it("couvre l'erreur ancienne suivie d'une synchro réussie puis d'une divergence", () => {
    const erreur = derniereErreurParNumero(
      [{ error: "eligibilite: Sync dossier 11 échouée: x", createdAt: new Date("2026-08-01") }],
      "eligibilite"
    ).get("11");
    expect(erreurSyncEnCours(erreur, new Date("2026-09-15"))).toBe(false);
  });
});

describe("extraireConnexion", () => {
  const connexion = { pageInfo: { hasNextPage: false, endCursor: null }, nodes: [{ number: 1 }] };

  it("rend la connexion d'une réponse complète", () => {
    expect(extraireConnexion({ data: { demarche: { dossiers: connexion } } }, "dossiers", 1)).toBe(connexion);
  });

  it("refuse une réponse partielle : des données accompagnées d'erreurs", () => {
    expect(() =>
      extraireConnexion(
        { data: { demarche: { dossiers: connexion } }, errors: [{ extensions: { code: "unauthorized" } }] },
        "dossiers",
        3
      )
    ).toThrow("dossiers, page 3 : erreur GraphQL (unauthorized)");
  });

  it("refuse une erreur HTTP et une réponse vide", () => {
    expect(() => extraireConnexion({ httpError: "HTTP 502" }, "dossiers", 1)).toThrow("HTTP 502");
    expect(() => extraireConnexion({ data: { demarche: null } }, "dossiers", 1)).toThrow("réponse vide");
  });

  it("ne reprend jamais le message d'une erreur GraphQL, qui pourrait citer une donnée", () => {
    const erreur = { message: "Dossier 12345 de Jeanne Martin introuvable", extensions: { code: "not_found" } };
    try {
      extraireConnexion({ errors: [erreur] } as never, "dossiers", 1);
      expect.unreachable();
    } catch (e) {
      expect((e as Error).message).not.toContain("Jeanne");
      expect((e as Error).message).not.toContain("12345");
    }
  });
});

describe("messageSur", () => {
  it("garde le message d'une erreur de collecte", () => {
    expect(messageSur(new ErreurCollecte("dossiers, page 2 : HTTP 500"))).toBe("dossiers, page 2 : HTTP 500");
  });

  it("masque le texte d'une erreur externe, SQL compris", () => {
    const sql = new Error("Failed query: select ... where id in ($1) params: 3f2a-uuid");
    expect(messageSur(sql)).toBe("erreur inattendue (Error)");
  });
});
