"use client";

import { useEffect, useState, useMemo } from "react";
import { getStatistiquesAction } from "@/features/backoffice";
import type { Statistiques } from "@/features/backoffice";
import { useDsfrChart } from "@/shared/hooks/useDsfrChart";
import StatistiquesFunnel from "./StatistiquesFunnel";
import StatCard from "../shared/StatCard";

type ViewId = "globales" | "visites" | "funnel";

export default function StatistiquesPanel() {
  const [stats, setStats] = useState<Statistiques | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<ViewId>("globales");

  const chartLoaded = useDsfrChart("LineChart");

  useEffect(() => {
    async function loadStats() {
      setLoading(true);
      setError(null);

      const result = await getStatistiquesAction();

      if (result.success) {
        setStats(result.data);
      } else {
        setError(result.error);
      }

      setLoading(false);
    }

    loadStats();
  }, []);

  useEffect(() => {
    if (chartLoaded) {
      setTimeout(() => {
        const lineChart = document.querySelector("line-chart");
        if (lineChart?.shadowRoot) {
          const style = document.createElement("style");
          style.textContent = `.tooltip { display: none !important; }`;
          lineChart.shadowRoot.appendChild(style);
        }
      }, 200);
    }
  }, [chartLoaded]);

  const visitesTriees = useMemo(() => {
    if (!stats) return [];
    return [...stats.visitesParJour].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [stats]);

  const chartData = useMemo(() => {
    const datesFormatees = visitesTriees.map((visite) =>
      new Date(visite.date).toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "2-digit",
      })
    );
    const visitesValues = visitesTriees.map((visite) => visite.visites);

    return {
      xData: `[[${datesFormatees.map((d) => `"${d}"`).join(", ")}]]`,
      yData: `[[${visitesValues.join(", ")}]]`,
    };
  }, [visitesTriees]);

  if (loading) {
    return (
      <div className="fr-container fr-py-4w">
        <p>Chargement des statistiques...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fr-container fr-py-4w">
        <div className="fr-alert fr-alert--error">
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  const statistiquesGlobales = [
    {
      title: "Nombre de visites",
      value: stats.nombreVisitesTotales,
      icon: "fr-icon-eye-line",
    },
    {
      title: "Comptes créés",
      value: stats.nombreComptesCreés,
      icon: "fr-icon-user-line",
    },
    {
      title: "Demandes AMO",
      value: stats.nombreDemandesAMO,
      icon: "fr-icon-building-line",
    },
    {
      title: "AMO en attente",
      value: stats.nombreDemandesAMOEnAttente,
      icon: "fr-icon-time-line",
    },
    {
      title: "Total dossiers DS",
      value: stats.nombreTotalDossiersDS,
      icon: "fr-icon-file-text-line",
    },
    {
      title: "Dossiers brouillon",
      value: stats.nombreDossiersDSBrouillon,
      icon: "fr-icon-draft-line",
    },
    {
      title: "Dossiers envoyés",
      value: stats.nombreDossiersDSEnvoyés,
      icon: "fr-icon-send-plane-line",
    },
  ];

  return (
    <div className="w-full">
      {/* En-tête */}
      <div className="fr-mb-6w">
        <h1 className="fr-h2 fr-mb-2w">Statistiques</h1>
        <p className="fr-text--lg fr-text-mention--grey">
          Visualisez les données d'usage et de performance de la plateforme
        </p>
      </div>

      {/* Contrôle segmenté */}
      <fieldset className="fr-segmented fr-mb-6w">
        <legend className="fr-segmented__legend fr-sr-only">Sélection de la vue statistiques</legend>
        <div className="fr-segmented__elements">
          <div className="fr-segmented__element">
            <input
              value="globales"
              checked={activeView === "globales"}
              type="radio"
              id="segmented-stats-1"
              name="segmented-stats"
              onChange={() => setActiveView("globales")}
            />
            <label className="fr-icon-bar-chart-box-fill fr-label" htmlFor="segmented-stats-1">
              Statistiques globales
            </label>
          </div>
          <div className="fr-segmented__element">
            <input
              value="visites"
              checked={activeView === "visites"}
              type="radio"
              id="segmented-stats-2"
              name="segmented-stats"
              onChange={() => setActiveView("visites")}
            />
            <label className="fr-icon-eye-line fr-label" htmlFor="segmented-stats-2">
              Visites
            </label>
          </div>
          <div className="fr-segmented__element">
            <input
              value="funnel"
              checked={activeView === "funnel"}
              type="radio"
              id="segmented-stats-3"
              name="segmented-stats"
              onChange={() => setActiveView("funnel")}
            />
            <label className="fr-icon-arrow-down-line fr-label" htmlFor="segmented-stats-3">
              Funnel Mes Aides Réno
            </label>
          </div>
        </div>
      </fieldset>

      {/* Vue Statistiques globales */}
      {activeView === "globales" && (
        <div>
          <h2 className="fr-h3 fr-mb-3w">Statistiques globales</h2>
          <div className="fr-grid-row fr-grid-row--gutters">
            {statistiquesGlobales.map((stat) => (
              <StatCard
                key={stat.title}
                number={stat.value.toLocaleString("fr-FR")}
                label={stat.title}
                icon={stat.icon}
              />
            ))}
          </div>
        </div>
      )}

      {/* Vue Statistiques des visites */}
      {activeView === "visites" && (
        <div>
          <h2 className="fr-h3 fr-mb-3w">Statistiques des visites</h2>
          {chartLoaded && visitesTriees.length > 0 && (
            <div className="fr-mt-4w p-12 fr-background-default--grey">
              <h3 className="fr-h4 fr-mb-2w">Évolution des visites depuis l'ouverture (16/10/2025)</h3>
              <line-chart
                key="visites-chart"
                x={chartData.xData}
                y={chartData.yData}
                selected-palette="default"
                unit-tooltip="visites"
                name='["Visites du site depuis le début (16/10/2025)"]'
              />
            </div>
          )}
        </div>
      )}

      {/* Vue Funnel Mes Aides Réno */}
      {activeView === "funnel" && (
        <div>
          <h2 className="fr-h3 fr-mb-3w">Funnel : Complétude du simulateur RGA (Mes Aides Réno)</h2>
          <p className="fr-text--sm fr-text-mention--grey fr-mb-4w">Sur les 7 derniers jours</p>
          <StatistiquesFunnel funnel={stats.funnelSimulateurRGA} />
        </div>
      )}
    </div>
  );
}
