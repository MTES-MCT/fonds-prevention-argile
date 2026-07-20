import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { getMatomoSimulationsStats } from "./tableau-de-bord.service";
import { fetchMatomoEvents, fetchMatomoUniqueVisitors } from "../../acquisition/adapters/matomo-api.adapter";
import { db } from "@/shared/database/client";
import { MATOMO_EVENTS } from "@/shared/constants/matomo.constants";

vi.mock("@/shared/database/client", () => ({
  db: { select: vi.fn() },
}));

vi.mock("../../acquisition/adapters/matomo-api.adapter", () => ({
  fetchMatomoEvents: vi.fn(),
  fetchMatomoEventsByDepartment: vi.fn(),
  fetchMatomoUniqueVisitors: vi.fn(),
  fetchMatomoSimulationsGroupedByDepartment: vi.fn(),
  fetchMatomoSimulationsGroupedByDimension: vi.fn(),
  buildPartnerSegment: vi.fn(() => undefined),
}));

// countComptesCrees fait db.select().from().where() et lit [{ count }]
function mockComptesCrees(nombre: number) {
  vi.mocked(db.select).mockReturnValue({
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue([{ count: nombre }]),
    }),
  } as never);
}

const eventsAvecSimulations = new Map<string, number>([
  [MATOMO_EVENTS.SIMULATEUR_RESULT_ELIGIBLE, 12],
  [MATOMO_EVENTS.SIMULATEUR_RESULT_NON_ELIGIBLE, 8],
]);

describe("getMatomoSimulationsStats — panne Matomo vs vrai zero", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
    mockComptesCrees(5);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renvoie null (et non 0) quand Matomo est injoignable", async () => {
    vi.mocked(fetchMatomoEvents).mockRejectedValue(new Error("Erreur API Matomo: token_auth invalide"));
    vi.mocked(fetchMatomoUniqueVisitors).mockRejectedValue(new Error("Erreur API Matomo: token_auth invalide"));

    const stats = await getMatomoSimulationsStats("30j");

    expect(stats.simulationsMatomo).toBeNull();
    expect(stats.simulationsEligibles).toBeNull();
    expect(stats.simulationsNonEligibles).toBeNull();
    expect(stats.tauxTransformation).toBeNull();
    expect(stats.visiteursUniques).toBeNull();
  });

  it("trace la cause de la panne dans les logs", async () => {
    const erreur = new Error("Erreur API Matomo: token_auth invalide");
    vi.mocked(fetchMatomoEvents).mockRejectedValue(erreur);
    vi.mocked(fetchMatomoUniqueVisitors).mockRejectedValue(erreur);

    await getMatomoSimulationsStats("30j");

    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining("[matomo]"),
      "Erreur API Matomo: token_auth invalide"
    );
  });

  it("distingue un vrai zero Matomo d'une panne", async () => {
    vi.mocked(fetchMatomoEvents).mockResolvedValue(new Map());
    vi.mocked(fetchMatomoUniqueVisitors).mockResolvedValue(0);

    const stats = await getMatomoSimulationsStats("30j");

    expect(stats.simulationsMatomo).toEqual({ valeur: 0, variation: null });
    expect(stats.visiteursUniques).toEqual({ valeur: 0, variation: null });
  });

  it("renvoie les visiteurs uniques meme si les simulations echouent", async () => {
    vi.mocked(fetchMatomoEvents).mockRejectedValue(new Error("timeout"));
    vi.mocked(fetchMatomoUniqueVisitors).mockResolvedValue(4955);

    const stats = await getMatomoSimulationsStats("30j");

    expect(stats.simulationsMatomo).toBeNull();
    expect(stats.visiteursUniques?.valeur).toBe(4955);
  });

  it("renvoie les valeurs Matomo quand tout repond", async () => {
    vi.mocked(fetchMatomoEvents).mockResolvedValue(eventsAvecSimulations);
    vi.mocked(fetchMatomoUniqueVisitors).mockResolvedValue(4955);

    const stats = await getMatomoSimulationsStats("30j");

    expect(stats.simulationsMatomo?.valeur).toBe(20);
    expect(stats.simulationsEligibles?.valeur).toBe(12);
    expect(stats.simulationsNonEligibles?.valeur).toBe(8);
    expect(stats.visiteursUniques?.valeur).toBe(4955);
  });
});
