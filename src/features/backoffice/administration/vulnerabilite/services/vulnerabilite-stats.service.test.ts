import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  getVulnerabiliteStatsBdd,
  getVulnerabiliteTopDepartements,
  getVulnerabiliteFunnel,
} from "./vulnerabilite-stats.service";
import { vulnerabiliteSimulationsRepo } from "@/shared/database/repositories";
import {
  fetchMatomoCountByDimension,
  fetchMatomoFunnel,
} from "@/features/backoffice/administration/acquisition/adapters/matomo-api.adapter";
import { getClientEnv } from "@/shared/config/env.config";
import type { VulnerabiliteSimulation } from "@/shared/database/schema/vulnerabilite-simulations";
import type { MatomoFunnelFlowTableResponse } from "@/features/backoffice/administration/acquisition/domain/types/matomo-funnels.types";

vi.mock("@/shared/database/repositories", () => ({
  vulnerabiliteSimulationsRepo: { findSince: vi.fn() },
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
    createdAt: new Date("2026-06-01"),
    codeDepartement: "36",
    aleaRga: "fort",
    penteTerrain: "vers_facade",
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
    sourceChaleurSousSol: null,
    ...overrides,
  };
}

describe("getVulnerabiliteStatsBdd", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
      makeRow({ penteTerrain: "vers_facade" }),
      makeRow({ penteTerrain: "vers_facade" }),
      makeRow({ penteTerrain: "plat" }),
      // Critère conditionnel non répondu par cette simulation (pas d'arbre proche) :
      // ne doit pas fausser le dénominateur des autres critères.
      makeRow({ penteTerrain: "plat", arbreEssence: null }),
    ]);

    const stats = await getVulnerabiliteStatsBdd("30j");

    expect(stats.totalSimulations).toBe(4);
    const pente = stats.reponses.find((c) => c.critereId === "pente_terrain")!;
    expect(pente.total).toBe(4);
    const versFacade = pente.reponses.find((r) => r.reponse === "vers_facade")!;
    const plat = pente.reponses.find((r) => r.reponse === "plat")!;
    expect(versFacade).toMatchObject({ count: 2, pourcentage: 50, label: "La pente descend vers une façade" });
    expect(plat).toMatchObject({ count: 2, pourcentage: 50, label: "Le terrain est plat" });

    const essence = stats.reponses.find((c) => c.critereId === "arbre_essence")!;
    expect(essence.total).toBe(0);
    expect(essence.reponses).toEqual([]);
  });

  it("résout le libellé d'essence d'arbre, question sans catégorie", async () => {
    vi.mocked(vulnerabiliteSimulationsRepo.findSince).mockResolvedValue([
      makeRow({ arbreProximite: "oui", arbreEssence: "peuplier" }),
      makeRow({ arbreProximite: "oui", arbreEssence: "peuplier" }),
      makeRow({ arbreProximite: "oui", arbreEssence: "chene" }),
    ]);

    const stats = await getVulnerabiliteStatsBdd("30j");

    const essence = stats.reponses.find((c) => c.critereId === "arbre_essence")!;
    expect(essence.total).toBe(3);
    const peuplier = essence.reponses.find((r) => r.reponse === "peuplier")!;
    expect(peuplier).toMatchObject({ label: "Peuplier", count: 2, pourcentage: 67 });
  });

  it("calcule le nombre moyen de points par catégorie et par simulation, aléa exclu", async () => {
    vi.mocked(vulnerabiliteSimulationsRepo.findSince).mockResolvedValue([
      // 2 critiques (réseaux, arbre), 1 vigilance (pente) ; l'essence et l'aléa ne comptent pas.
      makeRow({ reseauxEnterres: "sous_fondations", arbreProximite: "oui", arbreEssence: "peuplier" }),
      // 1 critique (haies), 1 à vérifier (pente), 1 bonne pratique (réseaux), 1 sans objet.
      makeRow({ penteTerrain: "plat", haies: "proches_denses", reseauxEnterres: "eloignes", ensoleillement: "modere" }),
      // 1 vigilance (pente).
      makeRow(),
    ]);

    const stats = await getVulnerabiliteStatsBdd("30j");

    expect(stats.pointsMoyens).toEqual({ critique: 1, vigilance: 0.7, a_verifier: 0.3, bonne_pratique: 0.3 });
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
