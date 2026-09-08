import { describe, it, expect, vi, beforeEach } from "vitest";
import { db } from "@/shared/database/client";
import {
  fetchMatomoEvents,
  fetchMatomoUniqueVisitors,
  fetchMatomoUniqueVisitorsSeries,
} from "@/features/backoffice/administration/acquisition/adapters/matomo-api.adapter";
import { MATOMO_EVENTS } from "@/shared/constants/matomo.constants";
import { getPublicStatsCards, getPublicStatsEvolution } from "./public-stats.service";

vi.mock("@/shared/database/client", () => ({
  db: { select: vi.fn() },
}));

vi.mock("@/features/backoffice/administration/acquisition/adapters/matomo-api.adapter", () => ({
  fetchMatomoEvents: vi.fn(),
  fetchMatomoUniqueVisitors: vi.fn(),
  fetchMatomoUniqueVisitorsSeries: vi.fn(),
}));

function mockDbCount(nombre: number) {
  return {
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue([{ count: nombre }]),
    }),
  } as never;
}

function mockDbRows(rows: unknown[]) {
  return {
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(rows),
    }),
  } as never;
}

describe("getPublicStatsCards", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("agrège les compteurs BDD et Matomo depuis le lancement", async () => {
    vi.mocked(fetchMatomoUniqueVisitors).mockResolvedValue(12345);
    vi.mocked(fetchMatomoEvents).mockResolvedValue(
      new Map([
        [MATOMO_EVENTS.SIMULATEUR_RESULT_ELIGIBLE, 200],
        [MATOMO_EVENTS.SIMULATEUR_RESULT_NON_ELIGIBLE, 80],
      ])
    );
    // Ordre d'appel = ordre du Promise.all dans getPublicStatsCards : comptes créés, dossiers
    // d'éligibilité déposés, diagnostics.
    vi.mocked(db.select)
      .mockReturnValueOnce(mockDbCount(500)) // comptesCrees
      .mockReturnValueOnce(mockDbCount(150)) // dossiersEligibiliteDeposes
      .mockReturnValueOnce(mockDbCount(40)); // diagnostics

    const stats = await getPublicStatsCards();

    expect(stats).toEqual({
      visiteurs: 12345,
      simulationsEligibles: 200,
      simulationsTerminees: 280,
      comptesCrees: 500,
      dossiersEligibiliteDeposes: 150,
      diagnostics: 40,
    });
  });

  it("retombe sur null (jamais 0) pour les compteurs Matomo en panne, sans faire échouer la page", async () => {
    // null, pas 0 : page en ISR, un faux 0 resterait figé jusqu'à la prochaine régénération
    // (jusqu'à 1h) — cf. PublicStatsCards.
    vi.mocked(fetchMatomoUniqueVisitors).mockRejectedValue(new Error("timeout"));
    vi.mocked(fetchMatomoEvents).mockRejectedValue(new Error("timeout"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(db.select)
      .mockReturnValueOnce(mockDbCount(500))
      .mockReturnValueOnce(mockDbCount(150))
      .mockReturnValueOnce(mockDbCount(40));

    const stats = await getPublicStatsCards();

    expect(stats.visiteurs).toBeNull();
    expect(stats.simulationsEligibles).toBeNull();
    expect(stats.simulationsTerminees).toBeNull();
    // Les compteurs BDD restent corrects malgré la panne Matomo.
    expect(stats.comptesCrees).toBe(500);
    expect(stats.dossiersEligibiliteDeposes).toBe(150);
    expect(stats.diagnostics).toBe(40);
  });
});

describe("getPublicStatsEvolution", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renvoie null pour la série visiteurs en panne Matomo, jamais une série à 0 sur tous les mois", async () => {
    vi.mocked(fetchMatomoUniqueVisitorsSeries).mockRejectedValue(new Error("timeout"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(db.select)
      .mockReturnValueOnce(mockDbRows([])) // comptesCreesDates
      .mockReturnValueOnce(mockDbRows([])) // dossiersDeposesDates
      .mockReturnValueOnce(mockDbRows([])); // dossiersEligibiliteValideesDates

    const evolution = await getPublicStatsEvolution();

    expect(evolution.visiteurs).toBeNull();
  });
});
