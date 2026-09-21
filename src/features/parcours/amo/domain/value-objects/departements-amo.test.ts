import { describe, it, expect, vi, afterEach } from "vitest";
import { avCumuleAmo, estAmoObligatoire, peutPasserEnAutonomie } from "./departements-amo";

describe("departements-amo", () => {
  describe("getReglesAmo (config par défaut)", () => {
    describe("AMO obligatoire", () => {
      it.each([
        ["03", "Allier"],
        ["36", "Indre"],
        ["47", "Lot-et-Garonne"],
        ["54", "Meurthe-et-Moselle"],
        ["81", "Tarn"],
      ])("impose l'AMO dans le %s (%s)", (code) => {
        expect(estAmoObligatoire(code)).toBe(true);
      });

      it("accepte le format normalisé sans zéro initial (3 → 03)", () => {
        expect(estAmoObligatoire("3")).toBe(true);
      });

      it("accepte un code numérique (number)", () => {
        expect(estAmoObligatoire(3)).toBe(true);
        expect(estAmoObligatoire(54)).toBe(true);
      });
    });

    describe("AMO facultatif", () => {
      it.each([
        ["04", "Alpes-de-Haute-Provence"],
        ["24", "Dordogne"],
        ["32", "Gers"],
        ["59", "Nord (en attente validation préfecture)"],
        ["63", "Puy-de-Dôme"],
        ["82", "Tarn-et-Garonne"],
      ])("n'impose pas l'AMO dans le %s (%s)", (code) => {
        expect(estAmoObligatoire(code)).toBe(false);
      });

      it("laisse l'AMO facultatif par défaut pour un département non listé (75 Paris)", () => {
        expect(estAmoObligatoire("75")).toBe(false);
      });

      it("laisse l'AMO facultatif pour un DOM-TOM (974 La Réunion)", () => {
        expect(estAmoObligatoire("974")).toBe(false);
      });
    });

    it("aucun département ne cumule AV et AMO tant que l'env var n'est pas définie", () => {
      const departements = ["03", "04", "24", "32", "36", "47", "54", "59", "63", "75", "81", "82"];
      for (const code of departements) {
        expect(avCumuleAmo(code)).toBe(false);
      }
    });
  });

  describe("resolveReglesAmoForParcours / peutPasserEnAutonomie", () => {
    const parcours = (demandeur: string | null, agent: string | null = null) => ({
      rgaSimulationData: demandeur ? ({ logement: { commune: demandeur } } as never) : null,
      rgaSimulationDataAgent: agent ? ({ logement: { commune: agent } } as never) : null,
    });

    it("résout les règles depuis la commune du demandeur", () => {
      expect(peutPasserEnAutonomie(parcours("36044"))).toBe(false);
      expect(peutPasserEnAutonomie(parcours("75001"))).toBe(true);
    });

    it("retombe sur la simulation agent quand le demandeur n'a pas simulé", () => {
      expect(peutPasserEnAutonomie(parcours(null, "47001"))).toBe(false);
    });

    it("fait primer la commune du demandeur sur celle de l'agent (USER-first)", () => {
      expect(peutPasserEnAutonomie(parcours("75001", "47001"))).toBe(true);
    });

    it("refuse l'autonomie sans commune exploitable, au lieu de supposer l'AMO facultatif", () => {
      expect(peutPasserEnAutonomie(parcours(null))).toBe(false);
      expect(peutPasserEnAutonomie(parcours("abc"))).toBe(false);
    });
  });
});

/**
 * Obligation et cumul AV/AMO sont deux axes indépendants : le Gers cumule sans imposer.
 * Les listes étant configurées par env, on recharge le module pour couvrir les quatre cas.
 */
describe("règles départementales — obligation et cumul AV/AMO", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  async function chargerAvecConfig(obligatoires: string, fusionnes: string) {
    vi.resetModules();
    vi.stubEnv("NEXT_PUBLIC_DEPARTEMENTS_AMO_OBLIGATOIRE", obligatoires);
    vi.stubEnv("NEXT_PUBLIC_DEPARTEMENTS_AV_AMO_FUSIONNES", fusionnes);
    return import("./departements-amo");
  }

  /** Listes cibles de l'arrêté : le 32 cumule sans être obligatoire, le 36 impose sans cumuler. */
  const CONFIG_CIBLE = ["03,04,36,47,54,63,81", "03,04,32,54,63"] as const;

  it("32 : AMO non obligatoire, donc l'autonomie reste possible malgré le cumul AV/AMO", async () => {
    const { getReglesAmo: regles, peutPasserEnAutonomie: autonomie } = await chargerAvecConfig(...CONFIG_CIBLE);

    expect(regles("32")).toEqual({ amoObligatoire: false, avCumuleAmo: true });
    expect(
      autonomie({ rgaSimulationData: { logement: { commune: "32013" } } as never, rgaSimulationDataAgent: null })
    ).toBe(true);
  });

  it("32 : le cumul AV/AMO ne déclenche aucune attribution d'office", async () => {
    const { estAmoObligatoire: obligatoire } = await chargerAvecConfig(...CONFIG_CIBLE);

    expect(obligatoire("32")).toBe(false);
  });

  it("03 : AMO obligatoire et cumul AV/AMO — autonomie refusée, cumul reconnu", async () => {
    const { getReglesAmo: regles, peutPasserEnAutonomie: autonomie } = await chargerAvecConfig(...CONFIG_CIBLE);

    expect(regles("03")).toEqual({ amoObligatoire: true, avCumuleAmo: true });
    expect(
      autonomie({ rgaSimulationData: { logement: { commune: "03185" } } as never, rgaSimulationDataAgent: null })
    ).toBe(false);
  });

  it("36 : AMO obligatoire sans cumul — autonomie refusée, aucun cumul", async () => {
    const { getReglesAmo: regles } = await chargerAvecConfig(...CONFIG_CIBLE);

    expect(regles("36")).toEqual({ amoObligatoire: true, avCumuleAmo: false });
  });

  it("24 : ni obligation ni cumul", async () => {
    const { getReglesAmo: regles } = await chargerAvecConfig(...CONFIG_CIBLE);

    expect(regles("24")).toEqual({ amoObligatoire: false, avCumuleAmo: false });
  });

  it("une liste vide explicite écrase les valeurs par défaut", async () => {
    const { getReglesAmo: regles } = await chargerAvecConfig("", "");

    expect(regles("36")).toEqual({ amoObligatoire: false, avCumuleAmo: false });
  });
});
