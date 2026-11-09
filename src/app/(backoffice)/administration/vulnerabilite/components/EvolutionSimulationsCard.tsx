"use client";

import { useMemo } from "react";
import { useDsfrChart } from "@/shared/hooks/useDsfrChart";
import type { EvolutionSimulations } from "@/features/backoffice/administration/vulnerabilite/domain/types/vulnerabilite-stats.types";

interface EvolutionSimulationsCardProps {
  evolution: EvolutionSimulations | null;
  loading: boolean;
}

const LIBELLES_PAS = { day: "par jour", week: "par semaine", month: "par mois" } as const;

/** Simulations de vulnérabilité enregistrées par jour, semaine ou mois selon la période choisie. */
export function EvolutionSimulationsCard({ evolution, loading }: EvolutionSimulationsCardProps) {
  const chartLoaded = useDsfrChart("LineChart");

  const chartData = useMemo(() => {
    if (!evolution || evolution.points.length === 0) return null;

    // Dates en UTC : un point "week" ou "month" est le premier jour de son pas.
    const labels = evolution.points.map((p) =>
      new Date(p.date).toLocaleDateString(
        "fr-FR",
        evolution.granularite === "month"
          ? { month: "short", year: "2-digit", timeZone: "UTC" }
          : { day: "2-digit", month: "2-digit", timeZone: "UTC" }
      )
    );

    return {
      x: `[[${labels.map((l) => `"${l}"`).join(", ")}]]`,
      y: `[[${evolution.points.map((p) => p.simulations).join(", ")}]]`,
    };
  }, [evolution]);

  const libellePas = LIBELLES_PAS[evolution?.granularite ?? "day"];

  return (
    <div
      className="fr-p-3w"
      style={{
        backgroundColor: "var(--background-default-grey)",
        border: "1px solid var(--border-default-grey)",
      }}>
      <h2 className="fr-h4 fr-mb-1v">Évolution des simulations</h2>
      <p className="fr-text--sm fr-mb-2w" style={{ color: "var(--text-mention-grey)" }}>
        Nombre de simulations réalisées {libellePas}
      </p>

      {(loading || (chartData && !chartLoaded)) && (
        <p className="fr-text--sm fr-mb-0" style={{ color: "var(--text-mention-grey)" }}>
          Chargement...
        </p>
      )}
      {!loading && !chartData && (
        <p className="fr-text--sm fr-mb-0" style={{ color: "var(--text-mention-grey)" }}>
          Aucune simulation sur la période.
        </p>
      )}
      {!loading && chartData && chartLoaded && (
        <line-chart
          key={chartData.x}
          x={chartData.x}
          y={chartData.y}
          selected-palette="default"
          unit-tooltip="simulations"
          name='["Simulations"]'
        />
      )}
    </div>
  );
}
