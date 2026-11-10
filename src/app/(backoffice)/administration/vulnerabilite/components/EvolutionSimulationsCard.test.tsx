import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { EvolutionSimulationsCard } from "./EvolutionSimulationsCard";
import type { EvolutionSimulations } from "@/features/backoffice/administration/vulnerabilite/domain/types/vulnerabilite-stats.types";

vi.mock("@/shared/hooks/useDsfrChart", () => ({ useDsfrChart: () => true }));

function rendre(evolution: EvolutionSimulations) {
  return render(<EvolutionSimulationsCard evolution={evolution} loading={false} />);
}

describe("EvolutionSimulationsCard", () => {
  it("annonce l'absence de simulation au lieu d'une ligne plate à zéro", () => {
    const { container } = rendre({
      granularite: "week",
      points: [
        { date: "2026-10-26", simulations: 0 },
        { date: "2026-11-02", simulations: 0 },
      ],
    });

    expect(screen.getByText("Aucune simulation sur les semaines complètes de la période.")).toBeInTheDocument();
    expect(container.querySelector("line-chart")).toBeNull();
  });

  it("annonce aussi l'absence de pas complet, sans point à tracer", () => {
    rendre({ granularite: "month", points: [] });

    expect(screen.getByText("Aucune simulation sur les mois complets de la période.")).toBeInTheDocument();
  });

  it("trace les points et précise que le pas en cours est exclu", () => {
    const { container } = rendre({
      granularite: "day",
      points: [
        { date: "2026-11-08", simulations: 3 },
        { date: "2026-11-09", simulations: 0 },
      ],
    });

    expect(screen.getByText("Nombre de simulations réalisées par jour, aujourd'hui exclu")).toBeInTheDocument();
    const graphe = container.querySelector("line-chart");
    expect(graphe?.getAttribute("x")).toBe('[["08/11","09/11"]]');
    expect(graphe?.getAttribute("y")).toBe("[[3,0]]");
  });
});
