import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import SiteVitrineTab from "./SiteVitrineTab";
import type { Statistiques } from "@/features/backoffice/administration/acquisition/domain/types/statistiques.types";

vi.mock("@/shared/hooks/useDsfrChart", () => ({ useDsfrChart: () => false }));

function stats(matomo: Partial<Statistiques>): Statistiques {
  return {
    nombreComptesCreés: 0,
    nombreDemandesAMO: 0,
    nombreDemandesAMOEnAttente: 0,
    nombreTotalDossiersDS: 0,
    nombreDossiersDSBrouillon: 0,
    nombreDossiersDSEnvoyés: 0,
    nombreVisitesTotales: 0,
    variationVisites: null,
    visiteursUniques: 1200,
    variationVisiteursUniques: null,
    visitesParJour: [],
    granulariteVisites: "day",
    tauxRebond: 4,
    variationTauxRebond: null,
    funnelSimulateurRGA: null,
    ...matomo,
  };
}

function valeurDe(libelle: string): string | null | undefined {
  return screen.getByText(libelle).previousElementSibling?.textContent;
}

describe("SiteVitrineTab", () => {
  it("affiche les deux valeurs quand Matomo a répondu", () => {
    render(<SiteVitrineTab stats={stats({})} loading={false} />);

    expect(valeurDe("Visiteurs uniques")).toBe((1200).toLocaleString("fr-FR"));
    expect(valeurDe("Taux de rebond")).toBe("4%");
  });

  it("dit « Indisponible » pour la seule valeur que Matomo n'a pas rendue", () => {
    render(<SiteVitrineTab stats={stats({ visiteursUniques: null })} loading={false} />);

    expect(valeurDe("Visiteurs uniques")).toBe("Indisponible");
    expect(valeurDe("Taux de rebond")).toBe("4%");
  });

  it("garde un vrai zéro distinct d'une valeur indisponible", () => {
    render(<SiteVitrineTab stats={stats({ tauxRebond: 0 })} loading={false} />);

    expect(valeurDe("Taux de rebond")).toBe("0%");
  });

  it("affiche des points de suspension avant le premier chargement", () => {
    render(<SiteVitrineTab stats={null} loading={false} />);

    expect(valeurDe("Visiteurs uniques")).toBe("...");
  });
});
