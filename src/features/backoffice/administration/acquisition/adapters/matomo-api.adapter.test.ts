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

import { fetchMatomoCountByDimension, fetchMatomoSimulationsGroupedByDimension } from "./matomo-api.adapter";

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
