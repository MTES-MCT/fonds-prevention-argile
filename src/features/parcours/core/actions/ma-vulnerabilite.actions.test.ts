import { beforeEach, describe, expect, it, vi } from "vitest";
import { getSession } from "@/features/auth/server";
import { getEtatMaVulnerabiliteAction } from "./ma-vulnerabilite.actions";
import { isVulnerabiliteRgaActive } from "@/features/vulnerabilite-rga/domain/value-objects/vulnerabilite-disponibilite";
import { getAdresseMaSimulation, getMaVulnerabilite } from "../services/ma-vulnerabilite.service";

vi.mock("@/features/auth/server", () => ({ getSession: vi.fn() }));
vi.mock("@/features/vulnerabilite-rga/domain/value-objects/vulnerabilite-disponibilite", () => ({
  isVulnerabiliteRgaActive: vi.fn(),
}));
vi.mock("../services/ma-vulnerabilite.service", () => ({
  getMaVulnerabilite: vi.fn(),
  getAdresseMaSimulation: vi.fn(),
}));

describe("getEtatMaVulnerabiliteAction", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(isVulnerabiliteRgaActive).mockReturnValue(true);
  });

  it("ne lit rien quand la feature est inactive", async () => {
    vi.mocked(isVulnerabiliteRgaActive).mockReturnValue(false);
    vi.mocked(getSession).mockResolvedValue({ userId: "user-1" } as never);

    expect(await getEtatMaVulnerabiliteAction()).toEqual({ success: true, data: { resume: null, adresse: null } });
    expect(getMaVulnerabilite).not.toHaveBeenCalled();
    expect(getAdresseMaSimulation).not.toHaveBeenCalled();
  });

  it("refuse sans session et ne lit rien", async () => {
    vi.mocked(getSession).mockResolvedValue(null as never);

    expect(await getEtatMaVulnerabiliteAction()).toEqual({ success: false, error: "Non connecté" });
    expect(getMaVulnerabilite).not.toHaveBeenCalled();
  });

  it("n'expose qu'un résumé sans score, daté", async () => {
    vi.mocked(getSession).mockResolvedValue({ userId: "user-1" } as never);
    vi.mocked(getAdresseMaSimulation).mockResolvedValue(null);
    vi.mocked(getMaVulnerabilite).mockResolvedValue({
      completedAt: new Date("2026-09-14T10:00:00Z"),
      aleaRga: "fort",
      codeDepartement: "36",
      mitoyennete: undefined,
      points: [{ critereId: "gouttieres", reponse: "absentes_ou_debordantes", categorie: "critique" }],
    });

    const resultat = await getEtatMaVulnerabiliteAction();

    expect(resultat).toMatchObject({
      success: true,
      data: {
        resume: { niveau: "critique", pointsPrioritaires: ["Gouttières"], date: "2026-09-14T10:00:00.000Z" },
        adresse: null,
      },
    });
  });

  it("renvoie un résumé vide tant que le test n'est pas fait", async () => {
    vi.mocked(getSession).mockResolvedValue({ userId: "user-1" } as never);
    vi.mocked(getMaVulnerabilite).mockResolvedValue(null);
    vi.mocked(getAdresseMaSimulation).mockResolvedValue(null);

    expect(await getEtatMaVulnerabiliteAction()).toEqual({ success: true, data: { resume: null, adresse: null } });
  });
});
