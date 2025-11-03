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

  const statistiquesGlobales = [
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

  const statistiquesVisites = [
    {
      title: "Total du nb de visites (30j)",
      value: stats.nombreVisitesTotales,
      icon: "fr-icon-eye-line",
    },
    {
      title: "Funnel simulateur (à implémenter)",
      value: 0, // À implémenter
      icon: "fr-icon-france-line",
    },
  ];

  // Trier les visites par date (plus récente en premier)
  const visitesTriees = [...stats.visitesParJour].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

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

      <h2 className="fr-h3 fr-mt-3w fr-mb-3w">Statistiques des visites</h2>
      {/* Tuiles des statistiques de visites */}
      <div className="fr-grid-row fr-grid-row--gutters">
        {statistiquesVisites.map((stat) => (
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

      {/* Tableau des visites par jour */}
      {visitesTriees.length > 0 && (
        <div className="fr-mt-6w">
          <h3 className="fr-h4 fr-mb-2w">Détail des visites par jour</h3>
          <div className="fr-table fr-table--bordered">
            <table>
              <thead>
                <tr>
                  <th scope="col">Date</th>
                  <th scope="col" className="fr-text--right">
                    Nombre de visites
                  </th>
                </tr>
              </thead>
              <tbody>
                {visitesTriees.map((visite) => (
                  <tr key={visite.date}>
                    <td>
                      {new Date(visite.date).toLocaleDateString("fr-FR", {
                        weekday: "long",
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </td>
                    <td className="fr-text--right fr-text--bold">
                      {visite?.visites?.toLocaleString("fr-FR")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
