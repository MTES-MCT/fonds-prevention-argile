import { describe, it, expect, vi, beforeEach } from "vitest";
import { getBuildingDataByRnbId } from "./bdnb.service";
import * as bdnbAdapter from "@/shared/adapters/bdnb";

vi.mock("@/shared/adapters/bdnb", () => ({
  fetchBatimentConstructionByRnbId: vi.fn(),
  fetchBatimentGroupeComplet: vi.fn(),
  fetchBatimentByCleBan: vi.fn(),
}));

const COORDONNEES = { lat: 46.5, lon: 1.8 };

describe("getBuildingDataByRnbId", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("renvoie les données BDNB normalement quand tout répond", async () => {
    vi.mocked(bdnbAdapter.fetchBatimentConstructionByRnbId).mockResolvedValue([
      { batiment_groupe_id: "bg1", rnb_id: "rnb1" },
    ]);
    vi.mocked(bdnbAdapter.fetchBatimentGroupeComplet).mockResolvedValue([
      { batiment_groupe_id: "bg1", alea_argiles: "moyen", annee_construction: 1980, nb_niveau: 2 },
    ]);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ alea: "fort" }) }));

    const result = await getBuildingDataByRnbId("rnb1", COORDONNEES);

    expect(result.donneesIndisponibles).toBeUndefined();
    expect(result.aleaIndetermine).toBeUndefined();
    // L'aléa interne (PostGIS) prime sur celui de BDNB quand il répond.
    expect(result.aleaArgiles).toBe("fort");
    expect(result.anneeConstruction).toBe(1980);
  });

  it("garde l'aléa BDNB si seul le calcul interne échoue", async () => {
    vi.mocked(bdnbAdapter.fetchBatimentConstructionByRnbId).mockResolvedValue([
      { batiment_groupe_id: "bg1", rnb_id: "rnb1" },
    ]);
    vi.mocked(bdnbAdapter.fetchBatimentGroupeComplet).mockResolvedValue([
      { batiment_groupe_id: "bg1", alea_argiles: "moyen" },
    ]);
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));

    const result = await getBuildingDataByRnbId("rnb1", COORDONNEES);

    expect(result.donneesIndisponibles).toBeUndefined();
    expect(result.aleaArgiles).toBe("moyen");
  });

  it("renvoie un squelette complétable, sans bloquer, quand BDNB ne répond pas", async () => {
    vi.mocked(bdnbAdapter.fetchBatimentConstructionByRnbId).mockRejectedValue(new Error("BDNB indisponible"));
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ alea: "faible" }) }));

    const result = await getBuildingDataByRnbId("rnb1", COORDONNEES);

    expect(result.donneesIndisponibles).toBe(true);
    expect(result.aleaIndetermine).toBe(false);
    expect(result.anneeConstruction).toBeNull();
    expect(result.nombreNiveaux).toBeNull();
    // L'aléa reste correctement déterminé via notre propre API, indépendamment de BDNB.
    expect(result.aleaArgiles).toBe("faible");
    expect(result.rnbId).toBe("rnb1");
  });

  it("ne renvoie JAMAIS un aléa null silencieux (= faux 'hors zone') quand tout échoue", async () => {
    vi.mocked(bdnbAdapter.fetchBatimentConstructionByRnbId).mockRejectedValue(new Error("BDNB indisponible"));
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));

    const result = await getBuildingDataByRnbId("rnb1", COORDONNEES);

    expect(result.donneesIndisponibles).toBe(true);
    expect(result.aleaIndetermine).toBe(true);
    expect(result.aleaArgiles).toBeNull();
  });

  it("aucune correspondance RNB->BDNB (bâtiment pas encore référencé) : même repli, pas d'exception", async () => {
    vi.mocked(bdnbAdapter.fetchBatimentConstructionByRnbId).mockResolvedValue([]);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ alea: null }) }));

    const result = await getBuildingDataByRnbId("rnb1", COORDONNEES);

    expect(result.donneesIndisponibles).toBe(true);
    expect(result.aleaIndetermine).toBe(false);
    expect(result.aleaArgiles).toBeNull();
  });
});
