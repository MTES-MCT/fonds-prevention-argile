import { describe, it, expect, vi, beforeEach } from "vitest";
import { getMatomoStatistiques } from "./matomo.service";
import * as matomoApiAdapter from "../adapters/matomo-api.adapter";

vi.mock("../adapters/matomo-api.adapter", () => ({
  fetchMatomoVisits: vi.fn(),
  fetchMatomoBounceRate: vi.fn(),
  fetchMatomoUniqueVisitors: vi.fn(),
}));

describe("matomo.service - getMatomoStatistiques", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(matomoApiAdapter.fetchMatomoBounceRate).mockResolvedValue(40);
    vi.mocked(matomoApiAdapter.fetchMatomoUniqueVisitors).mockResolvedValue(100);
  });

  it("garde les clés de date simples telles quelles en period=day (7j/30j)", async () => {
    vi.mocked(matomoApiAdapter.fetchMatomoVisits).mockResolvedValue({
      "2026-01-05": 10,
      "2026-01-06": 20,
    });

    const stats = await getMatomoStatistiques("7j");

    expect(stats.granulariteVisites).toBe("day");
    expect(matomoApiAdapter.fetchMatomoVisits).toHaveBeenCalledWith("day", expect.any(String), undefined);
    expect(stats.visitesParJour).toEqual([
      { date: "2026-01-05", visites: 10 },
      { date: "2026-01-06", visites: 20 },
    ]);
  });

  it("extrait la date de début des clés range 'début,fin' en period=week (90j/6m)", async () => {
    vi.mocked(matomoApiAdapter.fetchMatomoVisits).mockResolvedValue({
      "2026-01-05,2026-01-11": 30,
      "2026-01-12,2026-01-18": 45,
    });

    const stats = await getMatomoStatistiques("90j");

    expect(stats.granulariteVisites).toBe("week");
    expect(matomoApiAdapter.fetchMatomoVisits).toHaveBeenCalledWith("week", expect.any(String), undefined);
    expect(stats.visitesParJour).toEqual([
      { date: "2026-01-05", visites: 30 },
      { date: "2026-01-12", visites: 45 },
    ]);
    // Chaque date doit rester parsable (régression "Invalid Date")
    for (const v of stats.visitesParJour) {
      expect(Number.isNaN(new Date(v.date).getTime())).toBe(false);
    }
  });

  it("extrait la date de début des clés range 'début,fin' en period=month (tout)", async () => {
    vi.mocked(matomoApiAdapter.fetchMatomoVisits).mockResolvedValue({
      "2026-01-01,2026-01-31": 200,
    });

    const stats = await getMatomoStatistiques("tout");

    expect(stats.granulariteVisites).toBe("month");
    expect(matomoApiAdapter.fetchMatomoVisits).toHaveBeenCalledWith("month", expect.any(String), undefined);
    expect(stats.visitesParJour).toEqual([{ date: "2026-01-01", visites: 200 }]);
  });
});
