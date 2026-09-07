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
  // Liste fermée côté DN : un libellé qui diverge d'un caractère fait rejeter la valeur
  // sans erreur. Ce test verrouille la copie, il se met à jour via `pnpm ds:fetch-schema`.
  it("reprend au caractère près les 4 libellés de la liste déroulante DN", () => {
    expect(DS_LABELS_ETAT_MAISON).toEqual({
      saine: "Saine",
      "très peu endommagée": "Très peu endommagée (micro fissure de moins de 5mm)",
      endommagée: "Endommagée (micro fissure de plus de 5mm mais sans désordres structuraux)",
      "très endommagée": "Très endommagée (désordres structuraux empêchant l'usage normal de la maison)",
    });
  });
});
