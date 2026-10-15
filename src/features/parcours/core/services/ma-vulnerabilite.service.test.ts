import { beforeEach, describe, expect, it, vi } from "vitest";
import { getSession } from "@/features/auth/server";
import { parcoursRepo, vulnerabiliteSimulationsRepo } from "@/shared/database/repositories";
import { getAdresseMaSimulation, getMaVulnerabilite } from "./ma-vulnerabilite.service";

vi.mock("@/features/auth/server", () => ({ getSession: vi.fn() }));
vi.mock("@/shared/database/repositories", () => ({
  parcoursRepo: { findByUserId: vi.fn() },
  vulnerabiliteSimulationsRepo: { findById: vi.fn() },
}));

const mockedSession = vi.mocked(getSession);
const mockedParcours = vi.mocked(parcoursRepo.findByUserId);
const mockedSimulation = vi.mocked(vulnerabiliteSimulationsRepo.findById);

const SIMULATION = {
  id: "sim-1",
  createdAt: new Date("2026-09-14T10:00:00Z"),
  codeDepartement: "36",
  aleaRga: "fort",
  penteTerrain: "vers_facade",
  gouttieres: "entretenues_evacuation_loin",
  mitoyennete: "pas_mitoyen",
};

describe("getMaVulnerabilite", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockedSession.mockResolvedValue({ userId: "user-1" } as never);
  });

  it("renvoie null sans session, sans lire la base", async () => {
    mockedSession.mockResolvedValue(null as never);

    expect(await getMaVulnerabilite()).toBeNull();
    expect(mockedParcours).not.toHaveBeenCalled();
  });

  it("renvoie null tant qu'aucune simulation n'est rattachée au parcours", async () => {
    mockedParcours.mockResolvedValue({ vulnerabiliteSimulationId: null } as never);

    expect(await getMaVulnerabilite()).toBeNull();
    expect(mockedSimulation).not.toHaveBeenCalled();
  });

  it("lit la simulation du parcours de la session, jamais un identifiant venu du client", async () => {
    mockedParcours.mockResolvedValue({ vulnerabiliteSimulationId: "sim-1" } as never);
    mockedSimulation.mockResolvedValue(SIMULATION as never);

    const resultat = await getMaVulnerabilite();

    expect(mockedParcours).toHaveBeenCalledWith("user-1");
    expect(mockedSimulation).toHaveBeenCalledWith("sim-1");
    expect(resultat).toMatchObject({ aleaRga: "fort", codeDepartement: "36", mitoyennete: "pas_mitoyen" });
    expect(resultat?.points.map((p) => p.critereId)).toContain("pente_terrain");
  });

  it("ignore un aléa hors liste plutôt que de le propager", async () => {
    mockedParcours.mockResolvedValue({ vulnerabiliteSimulationId: "sim-1" } as never);
    mockedSimulation.mockResolvedValue({ ...SIMULATION, aleaRga: "inconnu" } as never);

    expect((await getMaVulnerabilite())?.aleaRga).toBeUndefined();
  });
});

describe("getAdresseMaSimulation", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockedSession.mockResolvedValue({ userId: "user-1" } as never);
  });

  it("reprend l'adresse de la simulation du demandeur", async () => {
    mockedParcours.mockResolvedValue({
      rgaSimulationData: {
        logement: {
          adresse: "97 Rue de Notz 36000 Châteauroux",
          commune: "36044",
          commune_nom: "Châteauroux",
          clef_ban: "36044_2080_00097",
          coordonnees: "46.8,1.68",
          code_departement: "36",
        },
      },
      rgaSimulationDataAgent: null,
    } as never);

    expect(await getAdresseMaSimulation()).toMatchObject({ clefBan: "36044_2080_00097", codeInsee: "36044" });
  });

  it("renvoie null sans session", async () => {
    mockedSession.mockResolvedValue(null as never);

    expect(await getAdresseMaSimulation()).toBeNull();
  });
});
