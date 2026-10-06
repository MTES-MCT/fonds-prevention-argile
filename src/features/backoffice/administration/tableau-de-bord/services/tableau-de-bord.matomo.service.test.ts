import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { getMatomoSimulationsStats, getTopDepartementsMatomo } from "./tableau-de-bord.service";
import {
  fetchMatomoEventsByDepartment,
  fetchMatomoSimulationsTerminees,
  fetchMatomoUniqueVisitors,
} from "../../acquisition/adapters/matomo-api.adapter";
import type { SimulationsTerminees } from "../../acquisition/domain/simulations-terminees";
import { db } from "@/shared/database/client";
import { MATOMO_EVENTS } from "@/shared/constants/matomo.constants";

vi.mock("@/shared/database/client", () => ({
  db: { select: vi.fn() },
}));

vi.mock("../../acquisition/adapters/matomo-api.adapter", () => ({
  fetchMatomoEventsByDepartment: vi.fn(),
  fetchMatomoSimulationsTerminees: vi.fn(),
  fetchMatomoUniqueVisitors: vi.fn(),
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

// countComptesCrees lit [{ count }] ; les stats par département de la BDD n'y trouvent aucune simulation.
function mockComptesCrees(nombre: number) {
  vi.mocked(db.select).mockReturnValue({
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue([{ count: nombre }]),
      innerJoin: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([]) }),
    }),
  } as never);
}

function simulations(
  parDepartement: Record<string, [number, number]>,
  nonRenseigne: [number, number] = [0, 0]
): SimulationsTerminees {
  return {
    parDepartement: new Map(
      Object.entries(parDepartement).map(([code, [eligible, nonEligible]]) => [code, { eligible, nonEligible }])
    ),
    nonRenseigne: { eligible: nonRenseigne[0], nonEligible: nonRenseigne[1] },
  };
}

const eventsAvecSimulations = simulations({ "63": [10, 5], "36": [2, 3] });
const evenementsDepartement = new Map<string, number>([
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
    vi.mocked(fetchMatomoSimulationsTerminees).mockRejectedValue(new Error("Erreur API Matomo: token_auth invalide"));
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
    vi.mocked(fetchMatomoSimulationsTerminees).mockRejectedValue(erreur);
    vi.mocked(fetchMatomoUniqueVisitors).mockRejectedValue(erreur);

    await getMatomoSimulationsStats("30j");

    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining("[matomo]"),
      "Erreur API Matomo: token_auth invalide"
    );
  });

  it("distingue un vrai zero Matomo d'une panne", async () => {
    vi.mocked(fetchMatomoSimulationsTerminees).mockResolvedValue(simulations({}));
    vi.mocked(fetchMatomoUniqueVisitors).mockResolvedValue(0);

    const stats = await getMatomoSimulationsStats("30j");

    expect(stats.simulationsMatomo).toEqual({ valeur: 0, variation: null });
    expect(stats.visiteursUniques).toEqual({ valeur: 0, variation: null });
  });

  it("renvoie les visiteurs uniques meme si les simulations echouent", async () => {
    vi.mocked(fetchMatomoSimulationsTerminees).mockRejectedValue(new Error("timeout"));
    vi.mocked(fetchMatomoUniqueVisitors).mockResolvedValue(4955);

    const stats = await getMatomoSimulationsStats("30j");

    expect(stats.simulationsMatomo).toBeNull();
    expect(stats.visiteursUniques?.valeur).toBe(4955);
  });

  it("renvoie les valeurs Matomo quand tout repond", async () => {
    vi.mocked(fetchMatomoSimulationsTerminees).mockResolvedValue(eventsAvecSimulations);
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
    vi.mocked(fetchMatomoSimulationsTerminees).mockResolvedValue(eventsAvecSimulations);
    vi.mocked(fetchMatomoEventsByDepartment).mockResolvedValue(evenementsDepartement);
    vi.mocked(fetchMatomoUniqueVisitors).mockResolvedValue(0);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("n'utilise jamais period=range pour les simulations", async () => {
    await getMatomoSimulationsStats("12m");

    const periodes = vi.mocked(fetchMatomoSimulationsTerminees).mock.calls.map(([options]) => options?.period);
    expect(periodes).not.toContain("range");
    expect(periodes.length).toBeGreaterThan(0);
  });

  it("interroge exactement les 90 jours demandés, sans déborder sur les semaines de bord", async () => {
    // Résultats sans nom : chaque sous-période retombe sur la dimension, dont on vérifie la fenêtre.
    vi.mocked(fetchMatomoSimulationsTerminees).mockResolvedValue(simulations({}, [1, 1]));
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

    const jours = joursInterroges(
      vi.mocked(fetchMatomoSimulationsTerminees).mock.calls.map(([options]) => options ?? {})
    );

    // Les deux fenêtres sont demandées dans le même appel de service : un doublon ici signifierait
    // qu'une journée est comptée dans la période courante ET dans la précédente.
    expect(new Set(jours).size).toBe(jours.length);
    expect(jours).toHaveLength(180);
  });

  it("cumule les sous-périodes en un seul total", async () => {
    vi.mocked(fetchMatomoSimulationsTerminees).mockResolvedValue(simulations({ "63": [2, 1] }, [1, 0]));

    const stats = await getMatomoSimulationsStats("90j");
    const nombreAppelsCourants = vi
      .mocked(fetchMatomoSimulationsTerminees)
      .mock.calls.map(([options]) => options?.date ?? "")
      .filter((date) => date >= "2026-06-11").length;

    expect(nombreAppelsCourants).toBeGreaterThan(1);
    expect(stats.simulationsEligibles?.valeur).toBe(3 * nombreAppelsCourants);
    expect(stats.simulationsNonEligibles?.valeur).toBe(1 * nombreAppelsCourants);
  });
});

describe("simulations terminées : une seule source pour l'entonnoir et les départements", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 10, 20, 10, 0));
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
    mockComptesCrees(0);
    vi.mocked(fetchMatomoUniqueVisitors).mockResolvedValue(0);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("fait tomber la somme des départements et du non-renseigné exactement sur l'entonnoir", async () => {
    vi.mocked(fetchMatomoSimulationsTerminees).mockResolvedValue(simulations({ "63": [4, 2], "75": [0, 3] }, [1, 5]));

    const [entonnoir, top] = await Promise.all([getMatomoSimulationsStats("30j"), getTopDepartementsMatomo("30j")]);

    const somme = top.departements.reduce((s, d) => s + d.simulations, 0) + top.nonRenseigne.simulations;
    const sommeEligibles =
      top.departements.reduce((s, d) => s + d.simulationsEligibles, 0) + top.nonRenseigne.simulationsEligibles;
    expect(somme).toBe(entonnoir.simulationsMatomo?.valeur);
    expect(sommeEligibles).toBe(entonnoir.simulationsEligibles?.valeur);
  });

  it("lit la ligne du département sans requête segmentée quand tous les résultats sont nommés", async () => {
    vi.mocked(fetchMatomoSimulationsTerminees).mockResolvedValue(simulations({ "63": [4, 2], "75": [0, 3] }));

    const [entonnoir, top] = await Promise.all([
      getMatomoSimulationsStats("30j", "63"),
      getTopDepartementsMatomo("30j", "63"),
    ]);

    expect(fetchMatomoEventsByDepartment).not.toHaveBeenCalled();
    expect(top.departements.map((d) => [d.codeDepartement, d.simulations])).toEqual([
      ["63", entonnoir.simulationsMatomo?.valeur],
    ]);
  });

  it("retombe sur la dimension, comptée en évènements, pour une sous-période antérieure au suivi", async () => {
    vi.mocked(fetchMatomoSimulationsTerminees).mockResolvedValue(simulations({}, [3, 3]));
    vi.mocked(fetchMatomoEventsByDepartment).mockResolvedValue(evenementsDepartement);

    await getMatomoSimulationsStats("7j", "63");

    expect(fetchMatomoEventsByDepartment).toHaveBeenCalledWith(
      "63",
      7,
      expect.objectContaining({ metrique: "nb_events" })
    );
  });

  it("ne complète plus un département inconnu de Matomo avec les simulations de la BDD", async () => {
    vi.mocked(fetchMatomoSimulationsTerminees).mockResolvedValue(simulations({ "63": [1, 0] }));

    const top = await getTopDepartementsMatomo("30j");

    expect(top.departements.every((d) => d.codeDepartement === "63")).toBe(true);
  });
});
