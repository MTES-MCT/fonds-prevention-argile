import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { useTopDepartementsMatomo } from "./useTopDepartementsMatomo";
import { getTopDepartementsMatomoAction } from "@/features/backoffice/administration/tableau-de-bord/actions/tableau-de-bord.actions";
import type {
  DepartementStats,
  PeriodeId,
} from "@/features/backoffice/administration/tableau-de-bord/domain/types/tableau-de-bord.types";

vi.mock("@/features/backoffice/administration/tableau-de-bord/actions/tableau-de-bord.actions", () => ({
  getTopDepartementsMatomoAction: vi.fn(),
}));

const action = vi.mocked(getTopDepartementsMatomoAction);

const INDRE: DepartementStats = {
  codeDepartement: "36",
  nomDepartement: "Indre",
  simulations: 3,
  simulationsEligibles: 1,
  pourcentageEligibles: 33,
  comptesCrees: 1,
  dossiersDN: 0,
  transformationGlobale: 0,
};

describe("useTopDepartementsMatomo", () => {
  beforeEach(() => vi.clearAllMocks());

  it("charge les départements et passe le filtre vide en undefined", async () => {
    action.mockResolvedValue({ success: true, data: [INDRE] });

    const { result } = renderHook(() => useTopDepartementsMatomo("30j", "", null));

    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.departements).toEqual([INDRE]);
    expect(result.current.erreur).toBe(false);
    expect(action).toHaveBeenCalledWith("30j", undefined, null);
  });

  it("signale une action en échec, sans la confondre avec un vrai vide", async () => {
    action.mockResolvedValue({ success: false, error: "Une erreur est survenue." });

    const { result } = renderHook(() => useTopDepartementsMatomo("30j", "", null));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.erreur).toBe(true);
    expect(result.current.departements).toBeNull();
  });

  it("arrête le chargement et signale l'erreur quand l'appel est rejeté", async () => {
    action.mockRejectedValue(new Error("réseau"));

    const { result } = renderHook(() => useTopDepartementsMatomo("30j", "", null));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.erreur).toBe(true);
  });

  it("distingue un vrai vide d'une erreur", async () => {
    action.mockResolvedValue({ success: true, data: [] });

    const { result } = renderHook(() => useTopDepartementsMatomo("30j", "", null));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.departements).toEqual([]);
    expect(result.current.erreur).toBe(false);
  });

  it("réessaie à la demande et se rétablit", async () => {
    action.mockResolvedValueOnce({ success: false, error: "Une erreur est survenue." });
    action.mockResolvedValueOnce({ success: true, data: [INDRE] });

    const { result } = renderHook(() => useTopDepartementsMatomo("30j", "", null));
    await waitFor(() => expect(result.current.erreur).toBe(true));

    act(() => result.current.reessayer());

    await waitFor(() => expect(result.current.departements).toEqual([INDRE]));
    expect(result.current.erreur).toBe(false);
    expect(action).toHaveBeenCalledTimes(2);
  });

  it("recharge quand un filtre change", async () => {
    action.mockResolvedValue({ success: true, data: [INDRE] });

    const { result, rerender } = renderHook(({ periode }) => useTopDepartementsMatomo(periode, "36", null), {
      initialProps: { periode: "30j" as PeriodeId },
    });
    await waitFor(() => expect(result.current.loading).toBe(false));

    rerender({ periode: "7j" });

    await waitFor(() => expect(action).toHaveBeenCalledTimes(2));
    expect(action).toHaveBeenLastCalledWith("7j", "36", null);
  });
});
