import { describe, it, expect, vi, beforeEach } from "vitest";
import { getMatomoStatistiques } from "./matomo.service";
import * as matomoApiAdapter from "../adapters/matomo-api.adapter";

vi.mock("../adapters/matomo-api.adapter", () => ({
  fetchMatomoVisits: vi.fn(),
  fetchMatomoBounceCounts: vi.fn(),
  fetchMatomoUniqueVisitorsStrict: vi.fn(),
}));

const panne = () => new Error("The operation was aborted due to timeout");

describe("matomo.service - getMatomoStatistiques", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(matomoApiAdapter.fetchMatomoVisits).mockResolvedValue({});
    vi.mocked(matomoApiAdapter.fetchMatomoBounceCounts).mockResolvedValue({ visites: 100, rebonds: 40 });
    vi.mocked(matomoApiAdapter.fetchMatomoUniqueVisitorsStrict).mockResolvedValue(100);
  });

  it("garde les clés de date simples telles quelles en period=day (7j/30j)", async () => {
    vi.mocked(matomoApiAdapter.fetchMatomoVisits).mockResolvedValue({
      "2026-01-05": 10,
      "2026-01-06": 20,
    });

    const stats = await getMatomoStatistiques("7j");

    expect(stats.granulariteVisites).toBe("day");
    expect(matomoApiAdapter.fetchMatomoVisits).toHaveBeenCalledWith("day", expect.any(String), undefined);
    expect(stats.visitesParJour).toEqual([
      { date: "2026-01-05", visites: 10 },
      { date: "2026-01-06", visites: 20 },
    ]);
  });

  it("extrait la date de début des clés range 'début,fin' en period=week (90j/6m)", async () => {
    vi.mocked(matomoApiAdapter.fetchMatomoVisits).mockResolvedValue({
      "2026-01-05,2026-01-11": 30,
      "2026-01-12,2026-01-18": 45,
    });

    const stats = await getMatomoStatistiques("90j");

    expect(stats.granulariteVisites).toBe("week");
    expect(matomoApiAdapter.fetchMatomoVisits).toHaveBeenCalledWith("week", expect.any(String), undefined);
    expect(stats.visitesParJour).toEqual([
      { date: "2026-01-05", visites: 30 },
      { date: "2026-01-12", visites: 45 },
    ]);
    // Chaque date doit rester parsable (régression "Invalid Date")
    for (const v of stats.visitesParJour) {
      expect(Number.isNaN(new Date(v.date).getTime())).toBe(false);
    }
  });

  it("extrait la date de début des clés range 'début,fin' en period=month (tout)", async () => {
    vi.mocked(matomoApiAdapter.fetchMatomoVisits).mockResolvedValue({
      "2026-01-01,2026-01-31": 200,
    });

    const stats = await getMatomoStatistiques("tout");

    expect(stats.granulariteVisites).toBe("month");
    expect(matomoApiAdapter.fetchMatomoVisits).toHaveBeenCalledWith("month", expect.any(String), undefined);
    expect(stats.visitesParJour).toEqual([{ date: "2026-01-01", visites: 200 }]);
  });

  it("convertit les valeurs renvoyées en string par Matomo (réponse multi-sous-période) au lieu de les remplacer par 0", async () => {
    // Régression : `typeof visites === "number"` échoue silencieusement sur une string Matomo,
    // remplaçant la valeur par 0 au lieu de la convertir.
    vi.mocked(matomoApiAdapter.fetchMatomoVisits).mockResolvedValue({
      "2026-01-01,2026-01-31": "150" as unknown as number,
    });

    const stats = await getMatomoStatistiques("tout");

    expect(stats.visitesParJour).toEqual([{ date: "2026-01-01", visites: 150 }]);
    expect(stats.nombreVisitesTotales).toBe(150);
  });

  describe("taux de rebond", () => {
    it("somme visites et rebonds des sous-périodes alignées au lieu d'un `range`", async () => {
      // Un mois plein pèse cent fois un bord : la moyenne des taux donnerait un tout autre chiffre.
      vi.mocked(matomoApiAdapter.fetchMatomoBounceCounts).mockImplementation((period) =>
        Promise.resolve(period === "month" ? { visites: 1000, rebonds: 30 } : { visites: 10, rebonds: 10 })
      );

      const stats = await getMatomoStatistiques("tout", "dimension1==36");

      const appels = vi.mocked(matomoApiAdapter.fetchMatomoBounceCounts).mock.calls;
      const mois = appels.filter(([period]) => period === "month").length;
      const bords = appels.length - mois;
      expect(mois).toBeGreaterThan(0);
      expect(bords).toBeGreaterThan(0);
      expect(appels.every(([period]) => period !== "range")).toBe(true);
      expect(appels.every(([, , segment]) => segment === "dimension1==36")).toBe(true);
      expect(stats.tauxRebond).toBe(Math.round(((30 * mois + 10 * bords) / (1000 * mois + 10 * bords)) * 100));
    });

    it("arrondit à l'entier, comme le taux que renvoyait Matomo", async () => {
      vi.mocked(matomoApiAdapter.fetchMatomoBounceCounts).mockResolvedValue({ visites: 1173, rebonds: 30 });

      const stats = await getMatomoStatistiques("7j");

      expect(stats.tauxRebond).toBe(3);
    });

    it("vaut 0 sans visite", async () => {
      vi.mocked(matomoApiAdapter.fetchMatomoBounceCounts).mockResolvedValue({ visites: 0, rebonds: 0 });

      const stats = await getMatomoStatistiques("7j");

      expect(stats.tauxRebond).toBe(0);
    });

    it("donne la variation en points par rapport à la période précédente", async () => {
      vi.mocked(matomoApiAdapter.fetchMatomoBounceCounts)
        .mockResolvedValueOnce({ visites: 100, rebonds: 40 })
        .mockResolvedValueOnce({ visites: 100, rebonds: 45 });

      const stats = await getMatomoStatistiques("30j");

      expect(stats.tauxRebond).toBe(40);
      expect(stats.variationTauxRebond).toBe(-5);
    });
  });

  describe("une lecture en panne n'emporte pas les autres", () => {
    it("garde la courbe et le taux de rebond quand les visiteurs uniques dépassent le délai", async () => {
      vi.mocked(matomoApiAdapter.fetchMatomoVisits).mockResolvedValue({ "2026-01-05": 10 });
      vi.mocked(matomoApiAdapter.fetchMatomoUniqueVisitorsStrict).mockRejectedValue(panne());

      const stats = await getMatomoStatistiques("30j");

      expect(stats.visiteursUniques).toBeNull();
      expect(stats.variationVisiteursUniques).toBeNull();
      expect(stats.visitesParJour).toEqual([{ date: "2026-01-05", visites: 10 }]);
      expect(stats.tauxRebond).toBe(40);
    });

    it("garde la valeur courante sans variation quand seule la période précédente échoue", async () => {
      vi.mocked(matomoApiAdapter.fetchMatomoUniqueVisitorsStrict)
        .mockResolvedValueOnce(120)
        .mockRejectedValueOnce(panne());

      const stats = await getMatomoStatistiques("30j");

      expect(stats.visiteursUniques).toBe(120);
      expect(stats.variationVisiteursUniques).toBeNull();
    });

    it("rend le taux de rebond indisponible si une de ses sous-périodes échoue", async () => {
      vi.mocked(matomoApiAdapter.fetchMatomoBounceCounts).mockRejectedValue(panne());

      const stats = await getMatomoStatistiques("30j");

      expect(stats.tauxRebond).toBeNull();
      expect(stats.variationTauxRebond).toBeNull();
      expect(stats.visiteursUniques).toBe(100);
    });

    it("rend une courbe vide quand les visites échouent, sans toucher aux deux cartes", async () => {
      vi.mocked(matomoApiAdapter.fetchMatomoVisits).mockRejectedValue(panne());

      const stats = await getMatomoStatistiques("30j");

      expect(stats.visitesParJour).toEqual([]);
      expect(stats.variationVisites).toBeNull();
      expect(stats.visiteursUniques).toBe(100);
      expect(stats.tauxRebond).toBe(40);
    });
  });
});
