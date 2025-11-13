"use client";

import { useEffect, useState, useMemo } from "react";
import { getStatistiquesAction } from "@/features/statistiques";
import type { Statistiques } from "@/features/statistiques";
import { useDsfrChart } from "@/shared/hooks/useDsfrChart";
import StatistiquesFunnel from "./StatistiquesFunnel";

export default function StatistiquesPanel() {
  const [stats, setStats] = useState<Statistiques | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Charger le composant LineChart
  const chartLoaded = useDsfrChart("LineChart");

  // Charger les statistiques au montage du composant
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

  // Masquer les tooltips du graphique après son chargement
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

  // Mémoriser les données triées
  const visitesTriees = useMemo(() => {
    if (!stats) return [];
    return [...stats.visitesParJour].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  }, [stats]);

  // Mémoriser les données formatées pour le graphique
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
    <div>
      <h2 className="fr-h3 fr-mb-3w">Statistiques globales</h2>

      {/* Tuiles des statistiques globales */}
      <div className="fr-grid-row fr-grid-row--gutters">
        {statistiquesGlobales.map((stat) => (
          <div key={stat.title} className="fr-col-12 fr-col-md-6 fr-col-lg-4">
            <div className="fr-tile fr-tile--sm">
              <div className="fr-tile__body">
                <div className="fr-tile__content">
                  <h3 className="fr-tile__title">{stat.title}</h3>
                  <p className="fr-tile__detail fr-text--lg fr-text--bold">
                    {stat.value.toLocaleString("fr-FR")}
                  </p>
                </div>
              </div>
              <div className="fr-tile__header">
                <div className="fr-tile__pictogram">
                  <span
                    className={`${stat.icon} fr-text--xl`}
                    aria-hidden="true"
                    style={{ fontSize: "3rem" }}
                  ></span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <h2 className="fr-h3 fr-mt-6w fr-mb-3w">Statistiques des visites</h2>

      {/* Graphique des visites */}
      {chartLoaded && visitesTriees.length > 0 && (
        <div className="fr-mt-6w">
          <h3 className="fr-h4 fr-mb-2w">
            Évolution des visites depuis l'ouverture (16/10/2025)
          </h3>
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

      {/* Statistiques du funnel Mes Aides Réno */}
      <h3 className="fr-h3 fr-mt-6w fr-mb-3w">
        Funnel : Complétude du simulateur RGA (Mes Aides Réno) sur les 7
        derniers jours
      </h3>
      <StatistiquesFunnel funnel={stats.funnelSimulateurRGA} />
    </div>
  );
}
