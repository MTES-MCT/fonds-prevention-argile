import { describe, it, expect, vi, afterEach } from "vitest";
import { getChampEtatMaisonEligibilite, DS_LABELS_ETAT_MAISON } from "./ds-champ-etat-maison";

describe("getChampEtatMaisonEligibilite", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  // Les ids sont encore des placeholders TODO (à relever via `pnpm ds:fetch-schema`) :
  // le champ n'est donc jamais préremplable tant qu'ils ne sont pas corrigés à la main.
  it("renvoie null et loggue un warn pour la démarche de prod (id en TODO)", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    expect(getChampEtatMaisonEligibilite(126061)).toBeNull();
    expect(warn).toHaveBeenCalledOnce();
    expect(warn.mock.calls[0][0]).toContain("126061");
  });

  it("renvoie null et loggue un warn pour la démarche de préprod (id en TODO)", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    expect(getChampEtatMaisonEligibilite(146377)).toBeNull();
    expect(warn).toHaveBeenCalledOnce();
    expect(warn.mock.calls[0][0]).toContain("146377");
  });

  it("renvoie null et loggue un warn sur une démarche inconnue", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    expect(getChampEtatMaisonEligibilite(999999)).toBeNull();
    expect(warn).toHaveBeenCalledOnce();
    expect(warn.mock.calls[0][0]).toContain("999999");
  });
});

describe("DS_LABELS_ETAT_MAISON", () => {
  it("couvre les 4 degrés de ETATS_SINISTRE", () => {
    expect(Object.keys(DS_LABELS_ETAT_MAISON).sort()).toEqual(
      ["saine", "très peu endommagée", "endommagée", "très endommagée"].sort()
    );
  });
});
