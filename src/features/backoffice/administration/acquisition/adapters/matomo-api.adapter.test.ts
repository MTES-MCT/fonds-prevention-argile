import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("next/cache", () => ({
  // Pass-through en test : ce fichier n'exerce donc que l'adaptateur, jamais le cache Next.
  unstable_cache: (fn: (...args: unknown[]) => unknown) => fn,
}));

vi.mock("@/shared/config/env.config", () => ({
  getServerEnv: vi.fn(() => ({ MATOMO_API_TOKEN: "token-test" })),
  getClientEnv: vi.fn(() => ({
    NEXT_PUBLIC_MATOMO_SITE_ID: "1",
    NEXT_PUBLIC_MATOMO_URL: "https://matomo.example.test",
  })),
}));

import {
  fetchMatomoCountByDimension,
  fetchMatomoEvents,
  fetchMatomoEventsByDepartment,
  fetchMatomoSimulationsGroupedByDimension,
} from "./matomo-api.adapter";

const originalFetch = global.fetch;

function mockFetchResponse(body: unknown) {
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(""),
  } as Response);
}

describe("fetchMatomoCountByDimension", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("agrège les visites par valeur de dimension (labels 'valeur - url' scope action)", async () => {
    mockFetchResponse([
      { label: "36 - fonds-prevention-argile.beta.gouv.fr/vulnerabilite-rga", nb_visits: 7 },
      { label: "36 - fonds-prevention-argile.beta.gouv.fr/vulnerabilite-rga?x=1", nb_visits: 3 },
      { label: "18 - fonds-prevention-argile.beta.gouv.fr/vulnerabilite-rga", nb_visits: 2 },
      { label: "-", nb_visits: 1 },
    ]);

    const result = await fetchMatomoCountByDimension(5, "eventAction==vulnerabilite_result");

    expect(result.get("36")).toBe(10);
    expect(result.get("18")).toBe(2);
    expect(result.size).toBe(2);
  });

  it("segmente la requête avec l'eventAction fourni, isolant les deux simulateurs", async () => {
    mockFetchResponse([]);

    await fetchMatomoCountByDimension(5, "eventAction==vulnerabilite_result");

    const [, init] = vi.mocked(global.fetch).mock.calls[0] as [string, RequestInit];
    const body = new URLSearchParams(init.body as string);
    expect(body.get("segment")).toBe("eventAction==vulnerabilite_result");
    expect(body.get("method")).toBe("CustomDimensions.getCustomDimension");
  });

  it("un seul appel HTTP (contrairement à fetchMatomoSimulationsGroupedByDimension qui en fait 2)", async () => {
    mockFetchResponse([]);

    await fetchMatomoCountByDimension(5, "eventAction==vulnerabilite_result");

    expect(global.fetch).toHaveBeenCalledTimes(1);
  });
});

describe("fetchMatomoSimulationsGroupedByDimension — non-régression après extraction du helper commun", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("fusionne les 2 appels (éligible + non éligible) par département", async () => {
    let callCount = 0;
    global.fetch = vi.fn().mockImplementation(() => {
      callCount += 1;
      const body =
        callCount === 1
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
