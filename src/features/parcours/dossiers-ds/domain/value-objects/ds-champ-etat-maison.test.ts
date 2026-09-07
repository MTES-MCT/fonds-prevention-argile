import { describe, it, expect, vi, afterEach } from "vitest";
import { getChampEtatMaisonEligibilite, DS_LABELS_ETAT_MAISON } from "./ds-champ-etat-maison";

describe("getChampEtatMaisonEligibilite", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  // Ids relevés via `pnpm ds:fetch-schema` : un champ_ inconnu étant avalé en silence par
  // DN, ces deux assertions sont le seul garde-fou contre une régression sur la map.
  it("renvoie l'id du champ pour la démarche de prod", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    expect(getChampEtatMaisonEligibilite(126061)).toBe("Q2hhbXAtNjg2MTM5OA==");
    expect(warn).not.toHaveBeenCalled();
  });

  it("renvoie l'id du champ pour la démarche de préprod", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    expect(getChampEtatMaisonEligibilite(146377)).toBe("Q2hhbXAtNjg2MTQzMA==");
    expect(warn).not.toHaveBeenCalled();
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
