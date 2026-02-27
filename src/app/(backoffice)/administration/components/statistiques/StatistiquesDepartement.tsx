"use client";

import { useEffect, useState, useCallback } from "react";
import {
  getDepartementsDisponiblesAction,
  getStatistiquesDepartementAction,
} from "@/features/backoffice";
import type {
  StatistiquesDepartement as StatsDepartement,
  DepartementDisponible,
} from "@/features/backoffice/administration/statistiques/domain/types";
import StatCard from "../shared/StatCard";
import DepartementSelector from "./DepartementSelector";

export default function StatistiquesDepartement() {
  const [departements, setDepartements] = useState<DepartementDisponible[]>([]);
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [stats, setStats] = useState<StatsDepartement | null>(null);
  const [loadingDepts, setLoadingDepts] = useState(true);
  const [loadingStats, setLoadingStats] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Charger la liste des départements au montage
  useEffect(() => {
    async function loadDepartements() {
      const result = await getDepartementsDisponiblesAction();
      if (result.success) {
        setDepartements(result.data);
      } else {
        setError(result.error);
      }
      setLoadingDepts(false);
    }
    loadDepartements();
  }, []);

  // Charger les stats quand un département est sélectionné
  const handleSelectDepartement = useCallback(async (code: string) => {
    setSelectedCode(code);
    setLoadingStats(true);
    setError(null);

    const result = await getStatistiquesDepartementAction(code);
    if (result.success) {
      setStats(result.data);
    } else {
      setError(result.error);
    }
    setLoadingStats(false);
  }, []);

  if (loadingDepts) {
    return <p>Chargement des départements...</p>;
  }

  return (
    <div>
      <h2 className="fr-h3 fr-mb-3w">Statistiques par département</h2>

      <div className="fr-callout fr-callout--blue-ecume fr-mb-4w">
        <p className="fr-callout__text fr-text--sm">
          Les statistiques de visites (Matomo) ne sont pas disponibles par département. Seules les
          données issues de la base de données sont affichées.
        </p>
      </div>

      <DepartementSelector
        departements={departements}
        selectedCode={selectedCode}
        onChange={handleSelectDepartement}
        loading={loadingStats}
      />

      {error && (
        <div className="fr-alert fr-alert--error fr-mb-4w">
          <p>{error}</p>
        </div>
      )}

      {loadingStats && <p>Chargement des statistiques...</p>}

      {stats && !loadingStats && (
        <>
          {/* KPIs */}
          <div className="fr-grid-row fr-grid-row--gutters fr-mb-4w">
            <StatCard
              number={stats.funnelSimulateur.simulationsDemarrees.toLocaleString("fr-FR")}
              label="Simulations démarrées"
              icon="fr-icon-play-circle-line"
            />
            <StatCard
              number={stats.funnelSimulateur.simulationsCompletees.toLocaleString("fr-FR")}
              label="Simulations complétées"
              icon="fr-icon-check-line"
            />
            <StatCard
              number={stats.funnelSimulateur.eligibles.toLocaleString("fr-FR")}
              label="Éligibles"
              icon="fr-icon-success-line"
            />
            <StatCard
              number={stats.funnelSimulateur.nonEligibles.toLocaleString("fr-FR")}
              label="Non éligibles"
              icon="fr-icon-close-circle-line"
            />
          </div>

          <div className="fr-grid-row fr-grid-row--gutters fr-mb-6w">
            <StatCard
              number={stats.nombreComptesCreés.toLocaleString("fr-FR")}
              label="Comptes créés"
              icon="fr-icon-user-line"
            />
            <StatCard
              number={`${stats.pourcentageEligibles} %`}
              label="Taux d'éligibilité"
              icon="fr-icon-pie-chart-2-line"
            />
            <StatCard
              number={stats.totalParcours.toLocaleString("fr-FR")}
              label="Total parcours"
              icon="fr-icon-road-map-line"
            />
          </div>

          {/* Dossiers par étape */}
          <div className="fr-mb-6w">
            <h3 className="fr-h4 fr-mb-1w">Dossiers par étape</h3>
            <p className="fr-text-mention--grey fr-mb-3w">
              Répartition des dossiers selon leur étape actuelle
            </p>
            <div className="fr-table fr-table--bordered">
              <div className="fr-table__wrapper">
                <div className="fr-table__container">
                  <div className="fr-table__content">
                    <table>
                      <thead>
                        <tr>
                          <th scope="col">Étape</th>
                          <th scope="col">Nombre de dossiers</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stats.dossiersParEtape.map((d) => (
                          <tr key={d.etape}>
                            <td>{d.label}</td>
                            <td>{d.count.toLocaleString("fr-FR")}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Raisons d'inéligibilité + Top communes côte à côte */}
          <div className="fr-grid-row fr-grid-row--gutters">
            {/* Raisons d'inéligibilité */}
            <div className="fr-col-12 fr-col-md-6">
              <div className="fr-mb-6w">
                <h3 className="fr-h4 fr-mb-1w">Raisons d{"'"}inéligibilité</h3>
                <p className="fr-text-mention--grey fr-mb-3w">
                  Motifs de non-éligibilité les plus fréquents
                </p>
                <div className="fr-table fr-table--bordered">
                  <div className="fr-table__wrapper">
                    <div className="fr-table__container">
                      <div className="fr-table__content">
                        <table>
                          <thead>
                            <tr>
                              <th scope="col">Raison</th>
                              <th scope="col">Nombre</th>
                            </tr>
                          </thead>
                          <tbody>
                            {stats.raisonsIneligibilite.length === 0 ? (
                              <tr>
                                <td
                                  colSpan={2}
                                  style={{ textAlign: "center", color: "var(--text-mention-grey)" }}
                                >
                                  Aucune donnée
                                </td>
                              </tr>
                            ) : (
                              stats.raisonsIneligibilite.map((r) => (
                                <tr key={r.raison}>
                                  <td>{r.label}</td>
                                  <td>{r.count.toLocaleString("fr-FR")}</td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Top communes */}
            <div className="fr-col-12 fr-col-md-6">
              <div className="fr-mb-6w">
                <h3 className="fr-h4 fr-mb-1w">Top communes</h3>
                <p className="fr-text-mention--grey fr-mb-3w">
                  Communes avec le plus de parcours
                </p>
                <div className="fr-table fr-table--bordered">
                  <div className="fr-table__wrapper">
                    <div className="fr-table__container">
                      <div className="fr-table__content">
                        <table>
                          <thead>
                            <tr>
                              <th scope="col">Commune</th>
                              <th scope="col">Nombre</th>
                            </tr>
                          </thead>
                          <tbody>
                            {stats.zonesDynamiques.length === 0 ? (
                              <tr>
                                <td
                                  colSpan={2}
                                  style={{ textAlign: "center", color: "var(--text-mention-grey)" }}
                                >
                                  Aucune donnée
                                </td>
                              </tr>
                            ) : (
                              stats.zonesDynamiques.map((z) => (
                                <tr key={z.nom}>
                                  <td>{z.nom}</td>
                                  <td>{z.count.toLocaleString("fr-FR")}</td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
