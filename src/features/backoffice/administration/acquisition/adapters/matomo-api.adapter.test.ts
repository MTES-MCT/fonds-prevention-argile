import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Enveloppe transparente : n'exerce pas le cache Next, mais retient quelle enveloppe a servi et ce qu'elle a rendu.
const cache = vi.hoisted(() => ({
  appels: [] as { cles: string[]; revalidate: number; resultat: Promise<unknown> }[],
}));

vi.mock("next/cache", () => ({
  unstable_cache:
    (fn: (...args: unknown[]) => Promise<unknown>, cles: string[], options: { revalidate: number }) =>
    (...args: unknown[]) => {
      const resultat = fn(...args);
      cache.appels.push({ cles, revalidate: options.revalidate, resultat });
      return resultat;
    },
}));

vi.mock("@/shared/config/env.config", () => ({
  getServerEnv: vi.fn(() => ({ MATOMO_API_TOKEN: "token-test" })),
  getClientEnv: vi.fn(() => ({
    NEXT_PUBLIC_MATOMO_SITE_ID: "1",
    NEXT_PUBLIC_MATOMO_URL: "https://matomo.example.test",
  })),
}));

import {
  fetchMatomoBounceCounts,
  fetchMatomoCountByDimension,
  fetchMatomoEvents,
  fetchMatomoEventsByDepartment,
  fetchMatomoSimulationsGroupedByDimension,
  fetchMatomoUniqueVisitors,
  fetchMatomoUniqueVisitorsSeries,
  fetchMatomoUniqueVisitorsStrict,
} from "./matomo-api.adapter";
import { reinitialiserAppelsPatients } from "./appel-patient";
import { formaterDateMatomo } from "../domain/decoupage-periode";

const originalFetch = global.fetch;

// Chaque appel réel écrit une ligne de journal : on la capte pour ne pas noyer la sortie des tests.
beforeEach(() => {
  cache.appels.length = 0;
  reinitialiserAppelsPatients();
  vi.spyOn(console, "info").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

function mockFetchResponse(body: unknown) {
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(""),
  } as Response);
}

function corpsEnvoye(index = 0): URLSearchParams {
  const [, init] = vi.mocked(global.fetch).mock.calls[index] as [string, RequestInit];
  return new URLSearchParams(init.body as string);
}

describe("fetchMatomoCountByDimension", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("cumule les visites par valeur de dimension", async () => {
    mockFetchResponse([
      { label: "36", nb_visits: 10 },
      { label: "18", nb_visits: 2 },
      { label: "-", nb_visits: 1 },
    ]);

    const result = await fetchMatomoCountByDimension(5, "eventAction==vulnerabilite_result");

    expect(result.get("36")).toBe(10);
    expect(result.get("18")).toBe(2);
    expect(result.size).toBe(2);
  });

  it("lit encore l'ancien format à plat « valeur - url », pour une réponse restée en cache", async () => {
    mockFetchResponse([
      { label: "36 - fonds-prevention-argile.beta.gouv.fr/vulnerabilite-rga", nb_visits: 7 },
      { label: "36 - fonds-prevention-argile.beta.gouv.fr/vulnerabilite-rga?x=1", nb_visits: 3 },
    ]);

    const result = await fetchMatomoCountByDimension(5, "eventAction==vulnerabilite_result");

    expect(result.get("36")).toBe(10);
  });

  it("somme les sous-périodes d'une réponse en day/week/month", async () => {
    mockFetchResponse({
      "2026-09": [
        { label: "36", nb_visits: 4 },
        { label: "18", nb_visits: 1 },
      ],
      "2026-10": [{ label: "36", nb_visits: "6" }],
    });

    const result = await fetchMatomoCountByDimension(5, "eventAction==vulnerabilite_result", {
      period: "month",
      date: "2026-09-01,2026-10-31",
    });

    expect(result.get("36")).toBe(10);
    expect(result.get("18")).toBe(1);
  });

  it("rejette une sous-période non tabulaire au lieu de rendre un total amputé", async () => {
    mockFetchResponse({
      "2026-09": [{ label: "36", nb_visits: 4 }],
      "2026-10": { result: "error", message: "archive indisponible" },
    });

    await expect(
      fetchMatomoCountByDimension(5, "eventAction==vulnerabilite_result", {
        period: "month",
        date: "2026-09-01,2026-10-31",
      })
    ).rejects.toThrow("sous-periode non tabulaire");
  });

  it("rejette un compteur absent au lieu de le compter pour zéro", async () => {
    mockFetchResponse([{ label: "36" }]);

    await expect(fetchMatomoCountByDimension(5, "eventAction==vulnerabilite_result")).rejects.toThrow(
      "compteur non numerique"
    );
  });

  it("segmente la requête avec l'eventAction fourni, isolant les deux simulateurs", async () => {
    mockFetchResponse([]);

    await fetchMatomoCountByDimension(5, "eventAction==vulnerabilite_result");

    expect(corpsEnvoye().get("segment")).toBe("eventAction==vulnerabilite_result");
    expect(corpsEnvoye().get("method")).toBe("CustomDimensions.getCustomDimension");
  });

  it("demande toutes les valeurs, sans `flat` et avec la seule colonne utile", async () => {
    // `flat` faisait charger à Matomo une sous-table d'URL par valeur (34 s contre 0,7 s mesurés),
    // pour des totaux par valeur identiques.
    mockFetchResponse([]);

    await fetchMatomoCountByDimension(5, "eventAction==vulnerabilite_result");

    expect(corpsEnvoye().has("flat")).toBe(false);
    expect(corpsEnvoye().get("filter_limit")).toBe("-1");
    expect(corpsEnvoye().get("showColumns")).toBe("nb_visits");
  });

  it("ne met en cache que label et nb_visits, pour rester sous la limite de 2 Mo de Next", async () => {
    mockFetchResponse({
      "2026-09": [{ label: "36", nb_visits: 4, segment: "dimension5==36", idsubdatatable: 12 }],
    });

    await fetchMatomoCountByDimension(5, "eventAction==vulnerabilite_result", {
      period: "month",
      date: "2026-09-01,2026-09-30",
    });

    await expect(cache.appels[0].resultat).resolves.toEqual({ "2026-09": [{ label: "36", nb_visits: 4 }] });
  });

  it("un seul appel HTTP (contrairement à fetchMatomoSimulationsGroupedByDimension qui en fait 2)", async () => {
    mockFetchResponse([]);

    await fetchMatomoCountByDimension(5, "eventAction==vulnerabilite_result");

    expect(global.fetch).toHaveBeenCalledTimes(1);
  });
});

describe("fetchMatomoSimulationsGroupedByDimension", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("fusionne les 2 appels (éligible + non éligible) par valeur", async () => {
    global.fetch = vi.fn().mockImplementation((_url: string, init: RequestInit) => {
      const segment = new URLSearchParams(init.body as string).get("segment");
      const body =
        segment === "eventAction==simulateur_result_eligible"
          ? [{ label: "36", nb_visits: 5 }]
          : [
              { label: "36", nb_visits: 2 },
              { label: "18", nb_visits: 1 },
            ];
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(body),
        text: () => Promise.resolve(""),
      } as Response);
    });

    const result = await fetchMatomoSimulationsGroupedByDimension(5);

    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(result.get("36")).toEqual({ total: 7, eligible: 5, nonEligible: 2 });
    expect(result.get("18")).toEqual({ total: 1, eligible: 0, nonEligible: 1 });
  });
});

describe("appels identiques en cours", () => {
  const JANVIER = { period: "month", date: "2026-01-01,2026-01-31" };

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("partage un seul appel Matomo entre deux demandes simultanées", async () => {
    mockFetchResponse([{ label: "simulateur_result_eligible", nb_visits: 42 }]);

    const [a, b] = await Promise.all([fetchMatomoEvents(JANVIER), fetchMatomoEvents(JANVIER)]);

    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(a.get("simulateur_result_eligible")).toBe(42);
    expect(b.get("simulateur_result_eligible")).toBe(42);
  });

  it("ne partage pas deux demandes dont le segment diffère", async () => {
    mockFetchResponse([]);

    await Promise.all([fetchMatomoEvents(JANVIER), fetchMatomoEvents({ ...JANVIER, segment: "dimension1==36" })]);

    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it("ne retient pas un échec : la demande suivante repart vers Matomo", async () => {
    global.fetch = vi.fn().mockRejectedValueOnce(new DOMException("delai", "TimeoutError"));
    await expect(fetchMatomoEvents(JANVIER)).rejects.toThrow();

    mockFetchResponse([{ label: "simulateur_result_eligible", nb_visits: 42 }]);

    await expect(fetchMatomoEvents(JANVIER)).resolves.toEqual(new Map([["simulateur_result_eligible", 42]]));
  });
});

describe("durée de cache selon la plage", () => {
  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("garde 24 h une plage close, dont la réponse ne changera plus", async () => {
    mockFetchResponse([]);

    await fetchMatomoEvents({ period: "month", date: "2025-11-01,2025-11-30" });

    expect(cache.appels).toHaveLength(1);
    expect(cache.appels[0]).toMatchObject({ revalidate: 24 * 3600, cles: ["matomo-api", "plage-stable"] });
  });

  it("garde 1 h une plage qui contient aujourd'hui", async () => {
    mockFetchResponse({});
    const aujourdHui = formaterDateMatomo(new Date());

    await fetchMatomoEvents({ period: "day", date: `${aujourdHui},${aujourdHui}` });

    expect(cache.appels[0]).toMatchObject({ revalidate: 3600, cles: ["matomo-api"] });
  });

  it("garde 1 h un mot-clé Matomo, dont la fin glisse chaque jour", async () => {
    mockFetchResponse([]);

    await fetchMatomoEvents({ period: "range", date: "2025-01-01,today" });

    expect(cache.appels[0].revalidate).toBe(3600);
  });
});

describe("journal des appels", () => {
  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("écrit une ligne par appel réussi, sans le jeton ni la valeur du segment", async () => {
    mockFetchResponse({});

    await fetchMatomoEventsByDepartment("36", 5, { period: "week", date: "2026-01-05,2026-01-18" });

    const ligne = vi.mocked(console.info).mock.calls[0][0] as string;
    expect(ligne).toMatch(
      /^\[matomo\] appel methode=Events\.getAction period=week jours=14 segment=dimension5 simultanes=1 duree=\d+ms issue=ok$/
    );
    expect(ligne).not.toContain("token-test");
  });

  it("signale un délai dépassé en avertissement", async () => {
    global.fetch = vi.fn().mockRejectedValue(new DOMException("delai", "TimeoutError"));

    await expect(fetchMatomoEvents({ period: "day", date: "2026-01-01,2026-01-01" })).rejects.toThrow();

    expect(vi.mocked(console.warn).mock.calls[0][0]).toContain("issue=timeout");
    expect(console.info).not.toHaveBeenCalled();
  });

  it("distingue le refus de Matomo, renvoyé en HTTP 200", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    mockFetchResponse({ result: "error", message: "token_auth invalide" });

    await expect(fetchMatomoEvents({ period: "day", date: "2026-01-02,2026-01-02" })).rejects.toThrow();

    expect(vi.mocked(console.warn).mock.calls[0][0]).toContain("issue=erreur_matomo");
  });

  it("compte les appels partis en même temps", async () => {
    mockFetchResponse({});

    await Promise.all([
      fetchMatomoEvents({ period: "day", date: "2026-01-03,2026-01-03" }),
      fetchMatomoEvents({ period: "day", date: "2026-01-04,2026-01-04" }),
    ]);

    const lignes = vi.mocked(console.info).mock.calls.map(([ligne]) => ligne as string);
    expect(lignes.some((ligne) => ligne.includes("simultanes=2"))).toBe(true);
  });
});

const mockFetch = vi.fn();

function jsonResponse(body: unknown, ok = true) {
  return {
    ok,
    status: ok ? 200 : 500,
    statusText: ok ? "OK" : "Error",
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
  };
}

/** Ligne calquée sur une réponse réelle de l'instance (champs conservés tels quels). */
function ligneEvent(label: string, nbVisits: number | string) {
  return {
    label,
    nb_visits: nbVisits,
    nb_events: typeof nbVisits === "string" ? Number(nbVisits) * 2 : nbVisits * 2,
    nb_events_with_value: 0,
    sum_event_value: 0,
    min_event_value: null,
    max_event_value: null,
    sum_daily_nb_uniq_visitors: 0,
    avg_event_value: 0,
  };
}

/** Les tests ci-dessous pilotent fetch via `mockFetch`, ceux du haut via `global.fetch` direct. */
function stubberFetch() {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", mockFetch);
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });
}

describe("fetchMatomoEvents — cumul des sous-périodes", () => {
  stubberFetch();

  it("lit un tableau plat tel quel en period=range", async () => {
    mockFetch.mockResolvedValue(
      jsonResponse([ligneEvent("simulateur_result_eligible", 5), ligneEvent("simulateur_result_non_eligible", 3)])
    );

    const result = await fetchMatomoEvents({ period: "range", date: "2026-01-01,2026-01-31" });

    expect(result.get("simulateur_result_eligible")).toBe(5);
    expect(result.get("simulateur_result_non_eligible")).toBe(3);
  });

  it("cumule un même label sur plusieurs semaines calendaires Matomo", async () => {
    // Vraies semaines lundi-dimanche : c'est le seul découpage que Matomo renvoie, et les clés
    // sont celles d'une plage déjà alignée (cf. decouperPeriodeMatomo côté service).
    mockFetch.mockResolvedValue(
      jsonResponse({
        "2026-01-05,2026-01-11": [ligneEvent("simulateur_result_eligible", 2)],
        "2026-01-12,2026-01-18": [ligneEvent("simulateur_result_eligible", 3)],
        "2026-01-19,2026-01-25": [ligneEvent("simulateur_result_non_eligible", 1)],
      })
    );

    const result = await fetchMatomoEvents({ period: "week", date: "2026-01-05,2026-01-25" });

    expect(result.get("simulateur_result_eligible")).toBe(5);
    expect(result.get("simulateur_result_non_eligible")).toBe(1);
  });

  it("envoie period/date tels quels à l'API Matomo (jamais 'range' forcé en dur)", async () => {
    mockFetch.mockResolvedValue(jsonResponse({}));

    await fetchMatomoEventsByDepartment("36", 5, { period: "month", date: "2025-11-01,2026-08-31" });

    const [, requestInit] = mockFetch.mock.calls[0];
    const body = new URLSearchParams(requestInit.body as string);
    expect(body.get("period")).toBe("month");
    expect(body.get("date")).toBe("2025-11-01,2026-08-31");
    expect(body.get("segment")).toBe("dimension5==36");
  });

  it("additionne quand Matomo sérialise nb_visits en string", async () => {
    // Régression : `0 + "234"` concatène ("0234") au lieu d'additionner. La sérialisation en
    // string n'est pas systématique (l'instance renvoie des nombres sur bien des réponses),
    // d'où la conversion défensive plutôt qu'un pari sur le format observé.
    mockFetch.mockResolvedValue(
      jsonResponse({
        "2026-01-01,2026-01-31": [ligneEvent("simulateur_result_eligible", "12")],
        "2026-02-01,2026-02-28": [ligneEvent("simulateur_result_eligible", "8")],
      })
    );

    const result = await fetchMatomoEvents({ period: "month", date: "2026-01-01,2026-02-28" });

    expect(result.get("simulateur_result_eligible")).toBe(20);
  });
});

describe("fetchMatomoEvents — une réponse douteuse ne devient jamais un total partiel", () => {
  stubberFetch();

  it("rejette quand une sous-période n'est pas tabulaire, au lieu de l'ignorer", async () => {
    // Sans rejet, le total ne porterait que sur janvier et serait affiché comme complet —
    // indiscernable d'une vraie baisse de moitié.
    mockFetch.mockResolvedValue(
      jsonResponse({
        "2026-01-01,2026-01-31": [ligneEvent("simulateur_result_eligible", 12)],
        "2026-02-01,2026-02-28": { result: "error", message: "archive indisponible" },
      })
    );

    await expect(fetchMatomoEvents({ period: "month", date: "2026-01-01,2026-02-28" })).rejects.toThrow(
      "sous-periode non tabulaire"
    );
  });

  it("rejette un compteur non numérique au lieu de propager un NaN", async () => {
    mockFetch.mockResolvedValue(jsonResponse([ligneEvent("simulateur_result_eligible", "indisponible")]));

    await expect(fetchMatomoEvents({ period: "range", date: "2026-01-01,2026-01-31" })).rejects.toThrow(
      "compteur non numerique"
    );
  });

  it("rejette une ligne dont le compteur est absent", async () => {
    mockFetch.mockResolvedValue(jsonResponse([{ label: "simulateur_result_eligible" }]));

    await expect(fetchMatomoEvents({ period: "range", date: "2026-01-01,2026-01-31" })).rejects.toThrow(
      "compteur non numerique"
    );
  });
});

describe("fetchMatomoSimulationsGroupedByDimension — ventilation par département", () => {
  stubberFetch();

  it("additionne éligible et non éligible même si Matomo sérialise nb_visits en string", async () => {
    mockFetch
      .mockResolvedValueOnce(jsonResponse([{ label: "36 - exemple.test/simulateur", nb_visits: "12" }]))
      .mockResolvedValueOnce(jsonResponse([{ label: "36 - exemple.test/simulateur", nb_visits: "8" }]));

    const result = await fetchMatomoSimulationsGroupedByDimension(5, {
      period: "range",
      date: "2026-01-01,2026-01-31",
    });

    expect(result.get("36")).toEqual({ eligible: 12, nonEligible: 8, total: 20 });
  });
});

describe("fetchMatomoEvents — propagation des erreurs à l'appelant", () => {
  stubberFetch();

  // L'absence de mise en cache des échecs n'est PAS couverte ici (unstable_cache est neutralisé
  // ci-dessus) : ces tests ne vérifient que la propagation, d'où l'appelant décide d'afficher
  // "Indisponible" plutôt qu'un zéro.
  it("propage une erreur d'authentification", async () => {
    mockFetch.mockResolvedValue(jsonResponse({ result: "error", message: "token_auth invalide" }));

    await expect(fetchMatomoEvents({ period: "day", date: "2026-01-01,2026-01-01" })).rejects.toThrow(
      "token_auth invalide"
    );
  });

  it("propage un timeout réseau", async () => {
    mockFetch.mockRejectedValueOnce(new DOMException("The operation was aborted", "AbortError"));

    await expect(fetchMatomoEvents({ period: "day", date: "2026-01-01,2026-01-01" })).rejects.toThrow();
  });
});

describe("visiteurs uniques", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("retombe sur 0 quand Matomo n'a pas calcule la metrique, pour ne pas casser le dashboard", async () => {
    // Variante tolerante, encore lue par le tableau de bord.
    mockFetchResponse({ nb_visits: 120 });

    await expect(fetchMatomoUniqueVisitors("range", "2025-10-16,2026-09-08")).resolves.toMatchObject({ valeur: 0 });
  });

  it("leve dans la variante stricte, pour que l'appelant affiche « Indisponible »", async () => {
    mockFetchResponse({ nb_visits: 120 });

    await expect(fetchMatomoUniqueVisitorsStrict("range", "2025-10-16,2026-09-08")).rejects.toThrow(/nb_uniq_visitors/);
  });

  it("laisse 60 s à l'appel et le tient hors du cache de Next, qui attendrait son recalcul", async () => {
    const delai = vi.spyOn(AbortSignal, "timeout");
    mockFetchResponse({ nb_uniq_visitors: 42 });

    await fetchMatomoUniqueVisitorsStrict("range", "2025-10-16,2026-09-08");

    expect(delai).toHaveBeenCalledWith(60_000);
    expect(cache.appels).toHaveLength(0);
    expect(corpsEnvoye().get("token_auth")).toBe("token-test");
  });

  it("accompagne le nombre de l'instant où Matomo l'a rendu", async () => {
    mockFetchResponse({ nb_uniq_visitors: 42 });
    const avant = Date.now();

    const resultat = await fetchMatomoUniqueVisitorsStrict("range", "2025-10-16,2026-09-08");

    expect(resultat.valeur).toBe(42);
    expect(new Date(resultat.calculeLe).toISOString()).toBe(resultat.calculeLe);
    expect(new Date(resultat.calculeLe).getTime()).toBeGreaterThanOrEqual(avant);
  });

  it("rend le résultat gardé à la demande suivante, sans nouvel appel", async () => {
    mockFetchResponse({ nb_uniq_visitors: 42 });

    await fetchMatomoUniqueVisitorsStrict("range", "2025-10-16,2026-09-08");
    await expect(fetchMatomoUniqueVisitors("range", "2025-10-16,2026-09-08")).resolves.toMatchObject({ valeur: 42 });

    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it("rend la main après 4 s quand Matomo calcule encore, pour afficher « Indisponible »", async () => {
    vi.useFakeTimers();
    global.fetch = vi.fn(() => new Promise<Response>(() => {}));

    const demande = fetchMatomoUniqueVisitorsStrict("range", "2025-10-16,2026-09-08", "dimension1==36");
    const issue = expect(demande).rejects.toThrow(/se poursuit en arriere-plan/);
    await vi.advanceTimersByTimeAsync(4_000);

    await issue;
    vi.useRealTimers();
  });

  it("convertit les valeurs de serie serialisees en string", async () => {
    mockFetchResponse({ "2025-10-01,2025-10-31": "4200", "2025-11-01,2025-11-30": 5100 });

    const serie = await fetchMatomoUniqueVisitorsSeries("month", "2025-10-01,2025-11-30");

    expect(serie).toEqual({ "2025-10-01,2025-10-31": 4200, "2025-11-01,2025-11-30": 5100 });
  });

  it("leve sur une valeur de serie non numerique plutot que de la compter comme un mois a zero", async () => {
    mockFetchResponse({ "2025-10-01,2025-10-31": "n/a" });

    await expect(fetchMatomoUniqueVisitorsSeries("month", "2025-10-01,2025-10-31")).rejects.toThrow(/non numerique/);
  });
});

describe("fetchMatomoBounceCounts", () => {
  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("demande seulement les visites et les rebonds de la sous-période", async () => {
    mockFetchResponse({ "2026-01-05,2026-01-11": { nb_visits: 100, bounce_count: 4 } });

    await fetchMatomoBounceCounts("week", "2026-01-05,2026-01-11", "dimension1==36");

    const corps = corpsEnvoye();
    expect(corps.get("method")).toBe("VisitsSummary.get");
    expect(corps.get("period")).toBe("week");
    expect(corps.get("showColumns")).toBe("nb_visits,bounce_count");
    expect(corps.get("segment")).toBe("dimension1==36");
  });

  it("cumule les sous-périodes, valeurs sérialisées en string comprises", async () => {
    mockFetchResponse({
      "2026-01-05": { nb_visits: 100, bounce_count: 4 },
      "2026-01-06": { nb_visits: "50", bounce_count: "1" },
    });

    await expect(fetchMatomoBounceCounts("day", "2026-01-05,2026-01-06")).resolves.toEqual({
      visites: 150,
      rebonds: 5,
    });
  });

  it("compte pour zéro une sous-période sans visite, renvoyée en tableau vide", async () => {
    mockFetchResponse({ "2026-01-05": { nb_visits: 100, bounce_count: 4 }, "2026-01-06": [] });

    await expect(fetchMatomoBounceCounts("day", "2026-01-05,2026-01-06")).resolves.toEqual({
      visites: 100,
      rebonds: 4,
    });
  });

  it("lit une ligne seule, sans index de sous-période", async () => {
    mockFetchResponse({ nb_visits: 80, bounce_count: 2 });

    await expect(fetchMatomoBounceCounts("range", "2026-01-05,2026-01-11")).resolves.toEqual({
      visites: 80,
      rebonds: 2,
    });
  });

  it("lève sur un compteur non numérique plutôt que de fausser le taux", async () => {
    mockFetchResponse({ "2026-01-05": { nb_visits: "n/a", bounce_count: 4 } });

    await expect(fetchMatomoBounceCounts("day", "2026-01-05,2026-01-05")).rejects.toThrow(/non numerique/);
  });

  it("lève sur une sous-période qui n'est pas une ligne", async () => {
    mockFetchResponse({ "2026-01-05": 12 });

    await expect(fetchMatomoBounceCounts("day", "2026-01-05,2026-01-05")).rejects.toThrow(/non structuree/);
  });
});
