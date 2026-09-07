import { describe, it, expect, vi, beforeEach } from "vitest";
import { vulnerabiliteSimulationsRepo } from "@/shared/database/repositories";
import { buildInfoVulnerabilite } from "./build-info-vulnerabilite.service";

vi.mock("@/shared/database/repositories", () => ({
  vulnerabiliteSimulationsRepo: { findById: vi.fn() },
}));

const mockedFindById = vi.mocked(vulnerabiliteSimulationsRepo.findById);

describe("buildInfoVulnerabilite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renvoie null sans requêter si aucun id de simulation n'est rattaché", async () => {
    const result = await buildInfoVulnerabilite(null);

    expect(result).toBeNull();
    expect(mockedFindById).not.toHaveBeenCalled();
  });

  it("renvoie null si la simulation pointée n'existe plus", async () => {
    mockedFindById.mockResolvedValue(null);

    const result = await buildInfoVulnerabilite("sim-1");

    expect(result).toBeNull();
  });

  it("mappe le score persisté et les réponses en libellés lisibles", async () => {
    mockedFindById.mockResolvedValue({
      id: "sim-1",
      createdAt: new Date("2026-06-01T10:00:00Z"),
      scoreGlobal: 42,
      penteTerrain: "vers_facade",
      reseauxEnterres: null,
      gravierProprete: null,
      gouttieres: null,
      arbreProximite: "non",
      arbreEssence: null,
      haies: null,
      vegetationPiedFacade: null,
      mitoyennete: null,
      ensoleillement: null,
      aleaRga: "fort",
    } as never);

    const result = await buildInfoVulnerabilite("sim-1");

    expect(result?.scoreGlobal).toBe(42);
    expect(result?.completedAt).toEqual(new Date("2026-06-01T10:00:00Z"));
    // Seules les réponses effectivement renseignées (non null) apparaissent.
    expect(result?.reponses).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: "Aléa RGA (sol)", valeur: "Aléa fort" }),
        expect.objectContaining({ label: "Pente du terrain", valeur: "La pente descend vers une façade" }),
        expect.objectContaining({ label: "Proximité d'un arbre", valeur: "Aucun arbre proche" }),
      ])
    );
    expect(result?.reponses).toHaveLength(3);
  });

  it("calcule le score d'impact de chaque réponse pour le code couleur côté agent", async () => {
    mockedFindById.mockResolvedValue({
      id: "sim-1",
      createdAt: new Date("2026-06-01T10:00:00Z"),
      scoreGlobal: 42,
      penteTerrain: null,
      reseauxEnterres: null,
      gravierProprete: null,
      gouttieres: null,
      arbreProximite: null,
      arbreEssence: null,
      haies: null,
      vegetationPiedFacade: null,
      mitoyennete: null,
      ensoleillement: null,
      aleaRga: "fort",
    } as never);

    const result = await buildInfoVulnerabilite("sim-1");

    expect(result?.reponses).toEqual([
      expect.objectContaining({ label: "Aléa RGA (sol)", impactScore: expect.any(Number) }),
    ]);
  });
});
