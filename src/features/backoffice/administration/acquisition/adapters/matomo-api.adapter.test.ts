import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("next/cache", () => ({
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

describe("fetchMatomoEvents — granularité additive (anti-timeout period=range)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", mockFetch);
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

describe("fetchMatomoEvents — granularité additive (anti-timeout period=range)", () => {
  it("lit un tableau plat tel quel en period=range (comportement historique préservé)", async () => {
    mockFetch.mockResolvedValue(
      jsonResponse([
        { label: "simulateur_result_eligible", nb_events: 5, nb_visits: 5 },
        { label: "simulateur_result_non_eligible", nb_events: 3, nb_visits: 3 },
      ])
    );

    const result = await fetchMatomoEvents({ period: "range", date: "2026-01-01,2026-01-31" });

    expect(result.get("simulateur_result_eligible")).toBe(5);
    expect(result.get("simulateur_result_non_eligible")).toBe(3);
  });

  it("cumule les nb_visits d'un même label à travers plusieurs sous-périodes (day/week/month)", async () => {
    mockFetch.mockResolvedValue(
      jsonResponse({
        "2026-01-01,2026-01-07": [{ label: "simulateur_result_eligible", nb_events: 2, nb_visits: 2 }],
        "2026-01-08,2026-01-14": [{ label: "simulateur_result_eligible", nb_events: 3, nb_visits: 3 }],
        "2026-01-15,2026-01-21": [{ label: "simulateur_result_non_eligible", nb_events: 1, nb_visits: 1 }],
      })
    );

    const result = await fetchMatomoEvents({ period: "week", date: "2026-01-01,2026-01-21" });

    expect(result.get("simulateur_result_eligible")).toBe(5);
    expect(result.get("simulateur_result_non_eligible")).toBe(1);
  });

  it("envoie period/date tels quels à l'API Matomo (jamais 'range' forcé en dur)", async () => {
    mockFetch.mockResolvedValue(jsonResponse({}));

    await fetchMatomoEventsByDepartment("36", 5, { period: "month", date: "2025-10-16,2026-09-07" });

    const [, requestInit] = mockFetch.mock.calls[0];
    const body = new URLSearchParams(requestInit.body as string);
    expect(body.get("period")).toBe("month");
    expect(body.get("date")).toBe("2025-10-16,2026-09-07");
    expect(body.get("segment")).toBe("dimension5==36");
  });

describe("fetchMatomoApi — cache négatif sur échec", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", mockFetch);
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

describe("fetchMatomoApi — cache négatif sur échec", () => {
  it("propage toujours une erreur à l'appelant (contrat préservé malgré le cache d'échec en interne)", async () => {
    mockFetch.mockResolvedValue(jsonResponse({ result: "error", message: "token_auth invalide" }));

    await expect(fetchMatomoEvents({ period: "day", date: "2026-01-01,2026-01-01" })).rejects.toThrow(
      "token_auth invalide"
    );
  });

  it("propage une erreur sur timeout réseau", async () => {
    mockFetch.mockRejectedValue(new DOMException("The operation was aborted", "AbortError"));

    await expect(fetchMatomoEvents({ period: "day", date: "2026-01-01,2026-01-01" })).rejects.toThrow();
  });
});
