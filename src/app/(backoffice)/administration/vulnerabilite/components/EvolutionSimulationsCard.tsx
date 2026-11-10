"use client";

import { useMemo } from "react";
import { useDsfrChart } from "@/shared/hooks/useDsfrChart";
import type { EvolutionSimulations } from "@/features/backoffice/administration/vulnerabilite/domain/types/vulnerabilite-stats.types";

interface EvolutionSimulationsCardProps {
  evolution: EvolutionSimulations | null;
  loading: boolean;
}

const PAS = {
  day: { libelle: "par jour", enCours: "aujourd'hui exclu", complets: "jours complets" },
  week: { libelle: "par semaine", enCours: "semaine en cours exclue", complets: "semaines complètes" },
  month: { libelle: "par mois", enCours: "mois en cours exclu", complets: "mois complets" },
} as const;

/** Simulations de vulnérabilité enregistrées par jour, semaine ou mois selon la période choisie. */
export function EvolutionSimulationsCard({ evolution, loading }: EvolutionSimulationsCardProps) {
  const chartLoaded = useDsfrChart("LineChart");

  const chartData = useMemo(() => {
    if (!evolution || evolution.points.every((p) => p.simulations === 0)) return null;

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
      x: JSON.stringify([labels]),
      y: JSON.stringify([evolution.points.map((p) => p.simulations)]),
    };
  }, [evolution]);

  const pas = PAS[evolution?.granularite ?? "day"];

  return (
    <div
      className="fr-p-3w"
      style={{
        backgroundColor: "var(--background-default-grey)",
        border: "1px solid var(--border-default-grey)",
      }}>
      <h2 className="fr-h4 fr-mb-1v">Évolution des simulations</h2>
      <p className="fr-text--sm fr-mb-2w" style={{ color: "var(--text-mention-grey)" }}>
        Nombre de simulations réalisées {pas.libelle}, {pas.enCours}
      </p>

      {(loading || (chartData && !chartLoaded)) && (
        <p className="fr-text--sm fr-mb-0" style={{ color: "var(--text-mention-grey)" }}>
          Chargement...
        </p>
      )}
      {!loading && !chartData && (
        <p className="fr-text--sm fr-mb-0" style={{ color: "var(--text-mention-grey)" }}>
          Aucune simulation sur les {pas.complets} de la période.
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
