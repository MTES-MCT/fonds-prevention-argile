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

/** Déplie les `date` passés à Matomo en jours, pour vérifier ce que la fenêtre couvre vraiment. */
function joursInterroges(appels: { period?: string; date?: string }[]): string[] {
  const jours: string[] = [];
  for (const { date } of appels) {
    const [debut, fin] = (date ?? "").split(",").map((iso) => {
      const [annee, mois, jour] = iso.split("-").map(Number);
      return new Date(annee, mois - 1, jour);
    });
    for (const courant = new Date(debut); courant <= fin; courant.setDate(courant.getDate() + 1)) {
      jours.push(courant.toDateString());
    }
  }
  return jours;
}

function joursAttendus(debut: string, fin: string): string[] {
  const jours: string[] = [];
  const derniere = new Date(fin);
  for (const courant = new Date(debut); courant <= derniere; courant.setDate(courant.getDate() + 1)) {
    jours.push(courant.toDateString());
  }
  return jours;
}

describe("getMatomoSimulationsStats — fenêtre réellement interrogée sur Matomo", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 8, 8, 14, 30));
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
    mockComptesCrees(5);
    vi.mocked(fetchMatomoEvents).mockResolvedValue(eventsAvecSimulations);
    vi.mocked(fetchMatomoEventsByDepartment).mockResolvedValue(eventsAvecSimulations);
    vi.mocked(fetchMatomoUniqueVisitors).mockResolvedValue(0);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("n'utilise jamais period=range pour les simulations", async () => {
    await getMatomoSimulationsStats("12m");

    const periodes = vi.mocked(fetchMatomoEvents).mock.calls.map(([options]) => options?.period);
    expect(periodes).not.toContain("range");
    expect(periodes.length).toBeGreaterThan(0);
  });

  it("interroge exactement les 90 jours demandés, sans déborder sur les semaines de bord", async () => {
    // Sans découpage, `period=week` sur cette fenêtre ferait renvoyer par Matomo les semaines
    // pleines 08-14/06 et 07-13/09, soit 9 jours hors période comptés dans le total.
    await getMatomoSimulationsStats("90j", "36");

    const appelsCourants = vi
      .mocked(fetchMatomoEventsByDepartment)
      .mock.calls.map(([, , options]) => options ?? {})
      .filter(({ date }) => (date ?? "") >= "2026-06-11");

    const jours = joursInterroges(appelsCourants);
    expect(jours).toEqual(joursAttendus("2026-06-11", "2026-09-08"));
    expect(new Set(jours).size).toBe(jours.length);
  });

  it("ne fait partager aucune journée entre la période courante et la précédente", async () => {
    await getMatomoSimulationsStats("90j");

    const jours = joursInterroges(vi.mocked(fetchMatomoEvents).mock.calls.map(([options]) => options ?? {}));

    // Les deux fenêtres sont demandées dans le même appel de service : un doublon ici signifierait
    // qu'une journée est comptée dans la période courante ET dans la précédente.
    expect(new Set(jours).size).toBe(jours.length);
    expect(jours).toHaveLength(180);
  });

  it("cumule les sous-périodes en un seul total", async () => {
    vi.mocked(fetchMatomoEvents).mockResolvedValue(
      new Map([
        [MATOMO_EVENTS.SIMULATEUR_RESULT_ELIGIBLE, 3],
        [MATOMO_EVENTS.SIMULATEUR_RESULT_NON_ELIGIBLE, 1],
      ])
    );

    const stats = await getMatomoSimulationsStats("90j");
    const nombreAppelsCourants = vi
      .mocked(fetchMatomoEvents)
      .mock.calls.map(([options]) => options?.date ?? "")
      .filter((date) => date >= "2026-06-11").length;

    expect(nombreAppelsCourants).toBeGreaterThan(1);
    expect(stats.simulationsEligibles?.valeur).toBe(3 * nombreAppelsCourants);
    expect(stats.simulationsNonEligibles?.valeur).toBe(1 * nombreAppelsCourants);
  });
});
