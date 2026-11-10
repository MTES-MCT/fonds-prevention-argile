import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  getVulnerabiliteStatsBdd,
  getVulnerabiliteTopDepartements,
  getVulnerabiliteFunnel,
  getVulnerabiliteComptesStats,
  compterSimulationsParPas,
} from "./vulnerabilite-stats.service";
import { parcoursRepo, vulnerabiliteSimulationsRepo } from "@/shared/database/repositories";
import {
  fetchMatomoCountByDimension,
  fetchMatomoFunnel,
} from "@/features/backoffice/administration/acquisition/adapters/matomo-api.adapter";
import { getClientEnv } from "@/shared/config/env.config";
import type { VulnerabiliteSimulation } from "@/shared/database/schema/vulnerabilite-simulations";
import type { MatomoFunnelFlowTableResponse } from "@/features/backoffice/administration/acquisition/domain/types/matomo-funnels.types";

vi.mock("@/shared/database/repositories", () => ({
  vulnerabiliteSimulationsRepo: { findSince: vi.fn() },
  parcoursRepo: { countCreesAvecSimulationVulnerabilite: vi.fn() },
}));

vi.mock("@/features/backoffice/administration/acquisition/adapters/matomo-api.adapter", () => ({
  fetchMatomoCountByDimension: vi.fn(),
  fetchMatomoFunnel: vi.fn(),
}));

vi.mock("@/shared/config/env.config", () => ({
  getClientEnv: vi.fn(() => ({})),
}));

function makeRow(overrides: Partial<VulnerabiliteSimulation> = {}): VulnerabiliteSimulation {
  return {
    id: "id",
    // Dans la période : le service écarte les lignes antérieures au début de la période.
    createdAt: new Date(),
    codeDepartement: "36",
    aleaRga: "fort",
    penteTerrain: "vers_facade_drainee",
    reseauxEnterres: null,
    gravierProprete: null,
    gouttieres: null,
    recuperateurEau: null,
    arbreProximite: null,
    arbreEssence: null,
    haies: null,
    vegetationPiedFacade: null,
    mitoyennete: null,
    ensoleillement: null,
    ...overrides,
  };
}

describe("getVulnerabiliteStatsBdd", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("évolution des simulations", () => {
    beforeEach(() => {
      vi.useFakeTimers({ toFake: ["Date"] });
      vi.setSystemTime(new Date("2026-11-10T09:00:00Z"));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    async function evolution(periode: Parameters<typeof getVulnerabiliteStatsBdd>[0]) {
      return (await getVulnerabiliteStatsBdd(periode)).evolution;
    }

    it("choisit le pas selon la période, comme les graphes Matomo", async () => {
      vi.mocked(vulnerabiliteSimulationsRepo.findSince).mockResolvedValue([]);

      expect((await evolution("30j")).granularite).toBe("day");
      expect((await evolution("90j")).granularite).toBe("week");
      expect((await evolution("12m")).granularite).toBe("month");
    });

    it("trace autant de pas complets que la période en compte, jours sans simulation compris", async () => {
      vi.mocked(vulnerabiliteSimulationsRepo.findSince).mockResolvedValue([]);

      const bornes = async (periode: Parameters<typeof getVulnerabiliteStatsBdd>[0]) => {
        const { points } = await evolution(periode);
        return [points.length, points[0].date, points.at(-1)?.date];
      };

      expect(await bornes("7j")).toEqual([7, "2026-11-03", "2026-11-09"]);
      expect(await bornes("30j")).toEqual([30, "2026-10-11", "2026-11-09"]);
      expect(await bornes("90j")).toEqual([13, "2026-08-10", "2026-11-02"]);
      expect(await bornes("12m")).toEqual([12, "2025-11-01", "2026-10-01"]);
      expect((await evolution("7j")).points.every((p) => p.simulations === 0)).toBe(true);
    });

    it("compte le premier pas en entier et laisse de côté le pas en cours", async () => {
      vi.mocked(vulnerabiliteSimulationsRepo.findSince).mockResolvedValue([
        makeRow({ createdAt: new Date("2025-11-02T10:00:00Z") }),
        makeRow({ createdAt: new Date("2025-11-20T10:00:00Z") }),
        makeRow({ createdAt: new Date("2026-11-05T10:00:00Z") }),
      ]);

      const stats = await getVulnerabiliteStatsBdd("12m");

      expect(vulnerabiliteSimulationsRepo.findSince).toHaveBeenCalledWith(new Date("2025-11-01T00:00:00Z"));
      expect(stats.evolution.points[0]).toEqual({ date: "2025-11-01", simulations: 2 });
      expect(stats.evolution.points.map((p) => p.date)).not.toContain("2026-11-01");
      // Les cartes gardent la période exacte : la simulation du 2 novembre 2025 n'en fait pas partie.
      expect(stats.totalSimulations).toBe(2);
    });

    it("fait commencer « Depuis le début » au mois de la première simulation", async () => {
      vi.mocked(vulnerabiliteSimulationsRepo.findSince).mockResolvedValue([
        makeRow({ createdAt: new Date("2026-08-03T10:00:00Z") }),
        makeRow({ createdAt: new Date("2026-06-15T10:00:00Z") }),
      ]);

      const { points } = await evolution("tout");

      expect(points[0]).toEqual({ date: "2026-06-01", simulations: 1 });
      expect(points.map((p) => p.date)).toEqual(["2026-06-01", "2026-07-01", "2026-08-01", "2026-09-01", "2026-10-01"]);
    });

    it("ne trace aucun point « Depuis le début » sans simulation", async () => {
      vi.mocked(vulnerabiliteSimulationsRepo.findSince).mockResolvedValue([]);

      expect((await evolution("tout")).points).toEqual([]);
    });
  });

  it("renvoie des stats vides sans exploser quand aucune simulation", async () => {
    vi.mocked(vulnerabiliteSimulationsRepo.findSince).mockResolvedValue([]);

    const stats = await getVulnerabiliteStatsBdd("30j");

    expect(stats.totalSimulations).toBe(0);
    expect(stats.pointsMoyens).toEqual({ critique: null, vigilance: null, a_verifier: null, bonne_pratique: null });
    for (const critere of stats.reponses) {
      expect(critere.reponses).toEqual([]);
      expect(critere.total).toBe(0);
    }
  });

  it("calcule le pourcentage par réponse sur le dénominateur des seules réponses données", async () => {
    vi.mocked(vulnerabiliteSimulationsRepo.findSince).mockResolvedValue([
      makeRow({ penteTerrain: "vers_facade_drainee" }),
      makeRow({ penteTerrain: "vers_facade_drainee" }),
      makeRow({ penteTerrain: "plat" }),
      // Critère conditionnel non répondu par cette simulation (pas d'arbre proche) :
      // ne doit pas fausser le dénominateur des autres critères.
      makeRow({ penteTerrain: "plat", arbreEssence: null }),
    ]);

    const stats = await getVulnerabiliteStatsBdd("30j");

    expect(stats.totalSimulations).toBe(4);
    const pente = stats.reponses.find((c) => c.critereId === "pente_terrain")!;
    expect(pente.total).toBe(4);
    const versFacade = pente.reponses.find((r) => r.reponse === "vers_facade_drainee")!;
    const plat = pente.reponses.find((r) => r.reponse === "plat")!;
    expect(versFacade).toMatchObject({
      count: 2,
      pourcentage: 50,
      label: "La pente descend vers une façade, avec un dispositif de drainage",
    });
    expect(plat).toMatchObject({ count: 2, pourcentage: 50, label: "Le terrain est plat" });

    const essence = stats.reponses.find((c) => c.critereId === "arbre_essence")!;
    expect(essence.total).toBe(0);
    expect(essence.reponses).toEqual([]);
  });

  it("résout le libellé du groupe d'essences", async () => {
    vi.mocked(vulnerabiliteSimulationsRepo.findSince).mockResolvedValue([
      makeRow({ arbreProximite: "oui", arbreEssence: "tres_agressif" }),
      makeRow({ arbreProximite: "oui", arbreEssence: "tres_agressif" }),
      makeRow({ arbreProximite: "oui", arbreEssence: "peu_agressif" }),
    ]);

    const stats = await getVulnerabiliteStatsBdd("30j");

    const essence = stats.reponses.find((c) => c.critereId === "arbre_essence")!;
    expect(essence.total).toBe(3);
    const gourmand = essence.reponses.find((r) => r.reponse === "tres_agressif")!;
    expect(gourmand).toMatchObject({ label: "Arbre très agressif", count: 2, pourcentage: 67 });
  });

  it("calcule le nombre moyen de points par catégorie et par simulation, aléa exclu", async () => {
    vi.mocked(vulnerabiliteSimulationsRepo.findSince).mockResolvedValue([
      // 2 critiques (réseaux, essence de l'arbre), 1 vigilance (pente) ; l'aléa ne compte pas.
      makeRow({ reseauxEnterres: "sous_fondations", arbreProximite: "oui", arbreEssence: "tres_agressif" }),
      // 1 critique (haies), 1 à vérifier (pente), 1 bonne pratique (réseaux), 1 sans objet.
      makeRow({
        penteTerrain: "plat",
        haies: "proches_denses",
        reseauxEnterres: "eloignes",
        recuperateurEau: "absent",
      }),
      // 1 vigilance (pente).
      makeRow(),
    ]);

    const stats = await getVulnerabiliteStatsBdd("30j");

    expect(stats.pointsMoyens).toEqual({ critique: 1, vigilance: 0.7, a_verifier: 0.3, bonne_pratique: 0.3 });
  });
});

describe("compterSimulationsParPas", () => {
  const dates = [new Date("2026-03-02T08:00:00Z"), new Date("2026-03-04T23:30:00Z"), new Date("2026-03-09T12:00:00Z")];

  it("compte par jour, en UTC", () => {
    const { points } = compterSimulationsParPas(dates, new Date("2026-03-02"), new Date("2026-03-05T00:00:00Z"), "day");

    expect(points).toEqual([
      { date: "2026-03-02", simulations: 1 },
      { date: "2026-03-03", simulations: 0 },
      { date: "2026-03-04", simulations: 1 },
    ]);
  });

  it("laisse de côté le pas en cours, incomplet", () => {
    const { points } = compterSimulationsParPas(dates, new Date("2026-03-02"), new Date("2026-03-04T12:00:00Z"), "day");

    expect(points).toEqual([
      { date: "2026-03-02", simulations: 1 },
      { date: "2026-03-03", simulations: 0 },
    ]);
  });

  it("compte par semaine du lundi au dimanche", () => {
    const { points } = compterSimulationsParPas(dates, new Date("2026-03-04"), new Date("2026-03-16"), "week");

    expect(points).toEqual([
      { date: "2026-03-02", simulations: 2 },
      { date: "2026-03-09", simulations: 1 },
    ]);
  });

  it("compte par mois", () => {
    const { points } = compterSimulationsParPas(dates, new Date("2026-02-20"), new Date("2026-04-01"), "month");

    expect(points).toEqual([
      { date: "2026-02-01", simulations: 0 },
      { date: "2026-03-01", simulations: 3 },
    ]);
  });
});

describe("getVulnerabiliteTopDepartements", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renvoie une liste vide sans appeler Matomo si la dimension département n'est pas configurée", async () => {
    vi.mocked(getClientEnv).mockReturnValue({} as ReturnType<typeof getClientEnv>);

    const result = await getVulnerabiliteTopDepartements("30j");

    expect(result).toEqual([]);
    expect(fetchMatomoCountByDimension).not.toHaveBeenCalled();
  });

  it("filtre sur l'event vulnerabilite_result (isolation Matomo des deux simulateurs)", async () => {
    vi.mocked(getClientEnv).mockReturnValue({
      NEXT_PUBLIC_MATOMO_DIMENSION_DEPARTEMENT_ID: "5",
    } as ReturnType<typeof getClientEnv>);
    vi.mocked(fetchMatomoCountByDimension).mockResolvedValue(new Map([["36", 12]]));

    const result = await getVulnerabiliteTopDepartements("30j");

    expect(fetchMatomoCountByDimension).toHaveBeenCalledWith(
      5,
      "eventAction==vulnerabilite_result",
      expect.objectContaining({ period: "range", toutesLesLignes: true })
    );
    expect(result).toEqual([{ codeDepartement: "36", nomDepartement: "Indre", simulations: 12 }]);
  });

  it("renvoie une liste vide (jamais une erreur) quand Matomo est injoignable", async () => {
    vi.mocked(getClientEnv).mockReturnValue({
      NEXT_PUBLIC_MATOMO_DIMENSION_DEPARTEMENT_ID: "5",
    } as ReturnType<typeof getClientEnv>);
    vi.mocked(fetchMatomoCountByDimension).mockRejectedValue(new Error("timeout"));
    vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await getVulnerabiliteTopDepartements("30j");

    expect(result).toEqual([]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });
});

describe("getVulnerabiliteFunnel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renvoie null sans appeler Matomo si le funnel dédié n'est pas configuré", async () => {
    vi.mocked(getClientEnv).mockReturnValue({} as ReturnType<typeof getClientEnv>);

    const result = await getVulnerabiliteFunnel();

    expect(result).toBeNull();
    expect(fetchMatomoFunnel).not.toHaveBeenCalled();
  });

  it("transforme la réponse Matomo quand le funnel est configuré", async () => {
    vi.mocked(getClientEnv).mockReturnValue({
      NEXT_PUBLIC_MATOMO_FUNNEL_ID_VULNERABILITE: "42",
    } as ReturnType<typeof getClientEnv>);
    const data: MatomoFunnelFlowTableResponse = [
      {
        label: "vulnerabilite_start",
        step_nb_visits: 100,
        step_nb_proceeded: 80,
        step_nb_exits: 20,
        step_proceeded_rate: "80 %",
        step_exited_rate: "20 %",
        step_position: 1,
        step_definition: "",
        customLabel: "",
        Actions: 0,
        isVisitorLogEnabled: false,
      },
    ];
    vi.mocked(fetchMatomoFunnel).mockResolvedValue(data);

    const result = await getVulnerabiliteFunnel();

    expect(fetchMatomoFunnel).toHaveBeenCalledWith("42", "range", expect.stringContaining(","));
    expect(result?.etapes).toHaveLength(1);
    expect(result?.visiteursInitiaux).toBe(100);
  });

  it("renvoie null (pas d'exception) si Matomo échoue", async () => {
    vi.mocked(getClientEnv).mockReturnValue({
      NEXT_PUBLIC_MATOMO_FUNNEL_ID_VULNERABILITE: "42",
    } as ReturnType<typeof getClientEnv>);
    vi.mocked(fetchMatomoFunnel).mockRejectedValue(new Error("502"));
    vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await getVulnerabiliteFunnel();

    expect(result).toBeNull();
  });
});

describe("getVulnerabiliteComptesStats", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("borne la cohorte des comptes à la date de début de la période", async () => {
    vi.mocked(parcoursRepo.countCreesAvecSimulationVulnerabilite).mockResolvedValue({ total: 340, avecSimulation: 12 });
    const avant = Date.now();

    const result = await getVulnerabiliteComptesStats("30j");

    const debut = vi.mocked(parcoursRepo.countCreesAvecSimulationVulnerabilite).mock.calls[0][0];
    const jours = (avant - debut.getTime()) / (24 * 60 * 60 * 1000);
    expect(Math.round(jours)).toBe(30);
    expect(result).toEqual({ totalComptes: 340, comptesAvecSimulation: 12 });
  });

  it("prend tous les comptes sur la période « depuis le début »", async () => {
    vi.mocked(parcoursRepo.countCreesAvecSimulationVulnerabilite).mockResolvedValue({ total: 0, avecSimulation: 0 });

    await getVulnerabiliteComptesStats("tout");

    expect(vi.mocked(parcoursRepo.countCreesAvecSimulationVulnerabilite).mock.calls[0][0]).toEqual(new Date(0));
  });
});
