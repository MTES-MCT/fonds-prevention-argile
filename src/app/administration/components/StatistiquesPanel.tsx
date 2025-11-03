"use client";

import { useEffect, useState } from "react";
import { getStatistiquesAction } from "@/features/statistiques";
import type { Statistiques } from "@/features/statistiques";

export default function StatistiquesPanel() {
  const [stats, setStats] = useState<Statistiques | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const statistiques = [
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

      <div className="fr-grid-row fr-grid-row--gutters">
        {statistiques.map((stat) => (
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
    </div>
  );
}
