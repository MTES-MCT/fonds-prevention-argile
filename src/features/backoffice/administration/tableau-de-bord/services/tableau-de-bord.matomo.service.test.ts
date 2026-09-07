import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { getMatomoSimulationsStats } from "./tableau-de-bord.service";
import {
  fetchMatomoEvents,
  fetchMatomoEventsByDepartment,
  fetchMatomoUniqueVisitors,
} from "../../acquisition/adapters/matomo-api.adapter";
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

// Dimension département déterministe (indépendante de l'env locale) pour le test filtré par département.
vi.mock("@/shared/config/env.config", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/shared/config/env.config")>();
  return {
    ...actual,
    getClientEnv: () => ({
      ...actual.getClientEnv(),
      NEXT_PUBLIC_MATOMO_DIMENSION_DEPARTEMENT_ID: "7",
    }),
  };
});

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

describe("getMatomoSimulationsStats — granularité des events (anti-timeout period=range)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
    mockComptesCrees(5);
    vi.mocked(fetchMatomoEvents).mockResolvedValue(eventsAvecSimulations);
    vi.mocked(fetchMatomoEventsByDepartment).mockResolvedValue(eventsAvecSimulations);
    vi.mocked(fetchMatomoUniqueVisitors).mockResolvedValue(0);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("n'utilise jamais period=range pour les simulations (toujours pre-archivable)", async () => {
    await getMatomoSimulationsStats("30j");

    expect(fetchMatomoEvents).toHaveBeenCalledWith(
      expect.objectContaining({ period: expect.not.stringMatching("range") })
    );
  });

  it("adapte la granularité à la durée de période, y compris avec un département filtré", async () => {
    await getMatomoSimulationsStats("30j", "36");
    expect(fetchMatomoEventsByDepartment).toHaveBeenCalledWith(
      "36",
      expect.any(Number),
      expect.objectContaining({ period: "day" })
    );

    vi.clearAllMocks();
    vi.mocked(fetchMatomoEventsByDepartment).mockResolvedValue(eventsAvecSimulations);
    vi.mocked(fetchMatomoUniqueVisitors).mockResolvedValue(0);

    await getMatomoSimulationsStats("12m", "36");
    expect(fetchMatomoEventsByDepartment).toHaveBeenCalledWith(
      "36",
      expect.any(Number),
      expect.objectContaining({ period: "month" })
    );
  });
});
