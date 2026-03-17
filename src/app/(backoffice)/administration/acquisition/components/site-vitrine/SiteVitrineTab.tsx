"use client";

import { useEffect, useMemo } from "react";
import { DashboardStatCard } from "../../../tableau-de-bord/shared/DashboardStatCard";
import { useDsfrChart } from "@/shared/hooks/useDsfrChart";
import type { Statistiques } from "@/features/backoffice/administration/acquisition/domain/types/statistiques.types";

interface SiteVitrineTabProps {
  stats: Statistiques | null;
  loading: boolean;
}

export default function SiteVitrineTab({ stats, loading }: SiteVitrineTabProps) {
  const chartLoaded = useDsfrChart("LineChart");

  // Masquer la legende et les tooltips du graphique apres chargement
  useEffect(() => {
    if (!chartLoaded) return;
    const timer = setTimeout(() => {
      const el = document.querySelector("line-chart");
      if (el?.shadowRoot) {
        const style = document.createElement("style");
        style.textContent = `.chart_legend { display: none !important; } .tooltip { display: none !important; }`;
        el.shadowRoot.appendChild(style);
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [chartLoaded]);

  // Trier les visites par date
  const visitesTriees = useMemo(() => {
    if (!stats?.visitesParJour?.length) return [];
    return [...stats.visitesParJour].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [stats?.visitesParJour]);

  // Formater les donnees pour le graphique dsfr-chart (format double crochets = multi-series)
  const chartData = useMemo(() => {
    if (!visitesTriees.length) return null;

    const datesFormatees = visitesTriees.map((v) =>
      new Date(v.date).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" })
    );
    const visitesValues = visitesTriees.map((v) => v.visites);

    return {
      x: `[[${datesFormatees.map((d) => `"${d}"`).join(", ")}]]`,
      y: `[[${visitesValues.join(", ")}]]`,
    };
  }, [visitesTriees]);

  return (
    <div>
      {/* KPIs site vitrine */}
      <h2 className="fr-h4 fr-mb-3w">KPIs site vitrine</h2>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          flexWrap: "wrap",
        }}>
        <div style={{ flex: "1 1 200px", minWidth: 0 }}>
          <DashboardStatCard
            className=""
            value={stats?.nombreVisitesTotales.toLocaleString("fr-FR") ?? "..."}
            label="Visiteurs uniques"
            variation={stats?.variationVisites ?? null}
            loading={loading}
            compact
          />
        </div>
        <div style={{ flex: "1 1 200px", minWidth: 0 }}>
          <DashboardStatCard
            className=""
            value={stats ? `${stats.tauxRebond.toLocaleString("fr-FR")}%` : "..."}
            label="Taux de rebond"
            variation={stats?.variationTauxRebond ?? null}
            variationType="points"
            loading={loading}
            compact
          />
        </div>
      </div>

      {/* Graphique evolution des visites */}
      <div
        className="fr-mt-4w"
        style={{
          backgroundColor: "var(--background-default-grey)",
          border: "1px solid var(--border-default-grey)",
        }}>
        <div className="fr-px-2w fr-pt-2w">
          <h2 className="fr-text--lg fr-mb-0" style={{ fontWeight: 700 }}>
            Évolution des visites sur le site vitrine
          </h2>
          <p className="fr-text--sm fr-mb-0 fr-mt-1v" style={{ color: "var(--text-mention-grey)" }}>
            Visiteurs uniques du site vitrine, par jour
          </p>
        </div>
        <div className="fr-p-2w">
          {loading && (
            <p className="fr-text--sm" style={{ color: "var(--text-mention-grey)" }}>
              Chargement...
            </p>
          )}
          {!loading && !chartData && (
            <p className="fr-text--sm" style={{ color: "var(--text-mention-grey)" }}>
              Aucune donnee disponible.
            </p>
          )}
          {!loading && chartData && chartLoaded && (
            <line-chart
              key="visites-chart"
              x={chartData.x}
              y={chartData.y}
              selected-palette="default"
              unit-tooltip="visites"
              name='["Visites"]'
            />
          )}
        </div>
      </div>
    </div>
  );
}
