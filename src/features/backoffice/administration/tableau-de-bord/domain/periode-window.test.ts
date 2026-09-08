import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { getFenetrePeriode, getFenetrePeriodePrecedente } from "./periode-window";
import { formaterDateMatomo } from "../../acquisition/domain/decoupage-periode";

describe("fenêtres de période — bornes exactes et sans recouvrement", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 8, 8, 14, 30));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("couvre n jours calendaires, aujourd'hui compris", () => {
    const { debut, dernierJour } = getFenetrePeriode("7j");

    expect(formaterDateMatomo(debut)).toBe("2026-09-02");
    expect(formaterDateMatomo(dernierJour)).toBe("2026-09-08");
  });

  it("laisse la borne BDD sur l'instant courant, pour ne pas exclure la journée en cours", () => {
    const { fin } = getFenetrePeriode("7j");

    expect(fin.getHours()).toBe(14);
  });

  it("place la période précédente juste avant, sans partager de journée", () => {
    const courante = getFenetrePeriode("7j");
    const precedente = getFenetrePeriodePrecedente("7j");

    expect(formaterDateMatomo(precedente!.debut)).toBe("2026-08-26");
    expect(formaterDateMatomo(precedente!.dernierJour)).toBe("2026-09-01");
    expect(precedente!.fin.getTime()).toBe(courante.debut.getTime());
  });

  it("donne deux fenêtres de même durée", () => {
    const jour = 86_400_000;
    const courante = getFenetrePeriode("30j");
    const precedente = getFenetrePeriodePrecedente("30j")!;

    expect(Math.round((courante.dernierJour.getTime() - courante.debut.getTime()) / jour)).toBe(29);
    expect(Math.round((precedente.dernierJour.getTime() - precedente.debut.getTime()) / jour)).toBe(29);
  });

  it("part de l'ouverture du service et n'a pas de période précédente sur « tout »", () => {
    expect(formaterDateMatomo(getFenetrePeriode("tout").debut)).toBe("2025-10-16");
    expect(getFenetrePeriodePrecedente("tout")).toBeNull();
  });
});
