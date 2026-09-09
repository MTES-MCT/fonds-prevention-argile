import { describe, it, expect, vi, beforeEach } from "vitest";
import { db } from "@/shared/database/client";
import {
  fetchMatomoEvents,
  fetchMatomoUniqueVisitorsStrict,
  fetchMatomoUniqueVisitorsSeries,
} from "@/features/backoffice/administration/acquisition/adapters/matomo-api.adapter";
import { MATOMO_EVENTS } from "@/shared/constants/matomo.constants";
import { getPublicStatsCards, getPublicStatsEvolution } from "./public-stats.service";

vi.mock("@/shared/database/client", () => ({
  db: { select: vi.fn() },
}));

vi.mock("@/features/backoffice/administration/acquisition/adapters/matomo-api.adapter", () => ({
  fetchMatomoEvents: vi.fn(),
  fetchMatomoUniqueVisitorsStrict: vi.fn(),
  fetchMatomoUniqueVisitorsSeries: vi.fn(),
}));

/** Maillon Drizzle minimal : `.from()` est déjà awaitable (comptage sans `where`) et chaînable. */
function mockDbQuery(rows: unknown[]) {
  const resultat = Promise.resolve(rows);
  const chainable = {
    from: () => chainable,
    where: () => resultat,
    then: (...args: Parameters<Promise<unknown[]>["then"]>) => resultat.then(...args),
  };
  return chainable as never;
}

function mockDbCount(nombre: number) {
  return mockDbQuery([{ count: nombre }]);
}

describe("getPublicStatsCards", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("agrège les compteurs BDD et Matomo depuis le lancement", async () => {
    vi.mocked(fetchMatomoUniqueVisitorsStrict).mockResolvedValue(12345);
    // Les sous-périodes suivantes ne portent aucun event : le total doit rester celui de la 1re.
    vi.mocked(fetchMatomoEvents).mockResolvedValue(new Map());
    vi.mocked(fetchMatomoEvents).mockResolvedValueOnce(
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

  it("somme les events par sous-période sans jamais demander un period=range (ADR-0033)", async () => {
    vi.mocked(fetchMatomoUniqueVisitorsStrict).mockResolvedValue(0);
    vi.mocked(fetchMatomoEvents).mockResolvedValue(new Map([[MATOMO_EVENTS.SIMULATEUR_RESULT_ELIGIBLE, 10]]));
    vi.mocked(db.select)
      .mockReturnValueOnce(mockDbCount(0))
      .mockReturnValueOnce(mockDbCount(0))
      .mockReturnValueOnce(mockDbCount(0));

    const stats = await getPublicStatsCards();
    const appels = vi.mocked(fetchMatomoEvents).mock.calls;

    expect(appels.length).toBeGreaterThan(1);
    for (const [options] of appels) {
      expect(options?.period).not.toBe("range");
    }
    expect(stats.simulationsEligibles).toBe(10 * appels.length);
  });

  it("retombe sur null (jamais 0) pour les compteurs Matomo en panne, sans faire échouer la page", async () => {
    // null, pas 0 : « Indisponible » vaut mieux qu'un faux zéro indiscernable d'une vraie valeur.
    vi.mocked(fetchMatomoUniqueVisitorsStrict).mockRejectedValue(new Error("timeout"));
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

  it("agrège les dates BDD par mois et partage l'axe des mois entre les séries", async () => {
    vi.mocked(fetchMatomoUniqueVisitorsSeries).mockResolvedValue({ "2025-10-01,2025-10-31": 4200 });
    vi.mocked(db.select)
      .mockReturnValueOnce(mockDbQuery([{ createdAt: new Date("2025-11-05T10:00:00Z") }]))
      .mockReturnValueOnce(mockDbQuery([{ submittedAt: new Date("2025-11-20T10:00:00Z") }]))
      .mockReturnValueOnce(mockDbQuery([{ processedAt: null }]));

    const evolution = await getPublicStatsEvolution();

    // Un point par mois depuis le lancement, identique d'une série à l'autre.
    const mois = evolution.comptesCrees.map((p) => p.label);
    expect(mois[0]).toBe("oct. 2025");
    expect(evolution.dossiersEligibiliteDeposes.map((p) => p.label)).toEqual(mois);
    expect(evolution.dossiersEligibiliteValides.map((p) => p.label)).toEqual(mois);
    expect(evolution.visiteurs?.map((p) => p.label)).toEqual(mois);

    expect(evolution.visiteurs?.[0]).toEqual({ label: "oct. 2025", count: 4200 });
    expect(evolution.comptesCrees.find((p) => p.label === "nov. 2025")?.count).toBe(1);
    expect(evolution.dossiersEligibiliteDeposes.find((p) => p.label === "nov. 2025")?.count).toBe(1);
    // `processedAt: null` (dossier non traité) ne doit pas être compté.
    expect(evolution.dossiersEligibiliteValides.every((p) => p.count === 0)).toBe(true);
  });

  it("renvoie null pour la série visiteurs en panne Matomo, jamais une série à 0 sur tous les mois", async () => {
    vi.mocked(fetchMatomoUniqueVisitorsSeries).mockRejectedValue(new Error("timeout"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(db.select)
      .mockReturnValueOnce(mockDbQuery([])) // comptesCreesDates
      .mockReturnValueOnce(mockDbQuery([])) // dossiersDeposesDates
      .mockReturnValueOnce(mockDbQuery([])); // dossiersEligibiliteValideesDates

    const evolution = await getPublicStatsEvolution();

    expect(evolution.visiteurs).toBeNull();
  });
});
