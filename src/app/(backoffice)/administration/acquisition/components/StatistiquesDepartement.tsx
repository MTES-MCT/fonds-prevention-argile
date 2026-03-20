"use client";

import { useEffect, useState, useCallback } from "react";
import {
  getDepartementsDisponiblesAction,
  getStatistiquesDepartementAction,
  getAgentDepartementsAction,
} from "@/features/backoffice";
import { useAuth } from "@/features/auth/client";
import { UserRole } from "@/shared/domain/value-objects";
import type {
  StatistiquesDepartement as StatsDepartement,
  DepartementDisponible,
} from "@/features/backoffice/administration/acquisition/domain/types";
import StatCard from "../../shared/StatCard";
import DepartementSelector from "./DepartementSelector";

export default function StatistiquesDepartement() {
  const { user } = useAuth();
  const isAnalyseDdt = user?.role === UserRole.ANALYSTE_DDT;

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
      if (!result.success) {
        setError(result.error);
        setLoadingDepts(false);
        return;
      }

      let availableDepts = result.data;

      // Pour les agents DDT : filtrer les départements selon leurs permissions
      if (isAnalyseDdt) {
        const agentDeptsResult = await getAgentDepartementsAction();
        if (agentDeptsResult.success && agentDeptsResult.data.length > 0) {
          const allowedCodes = agentDeptsResult.data;
          availableDepts = availableDepts.filter((d) => allowedCodes.includes(d.code));

          // Auto-sélectionner si un seul département
          if (availableDepts.length === 1) {
            setDepartements(availableDepts);
            setLoadingDepts(false);
            // Charger directement les stats du département
            handleSelectDepartement(availableDepts[0].code);
            return;
          }
        }
      }

      setDepartements(availableDepts);
      setLoadingDepts(false);
    }
    loadDepartements();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAnalyseDdt]);

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

  // Trouver le département sélectionné pour afficher son nom
  const selectedDepartement = departements.find((d) => d.code === selectedCode);

  return (
    <div>
      {/* Sélecteur de département en premier */}
      {!(isAnalyseDdt && departements.length <= 1) && (
        <DepartementSelector
          departements={departements}
          selectedCode={selectedCode}
          onChange={handleSelectDepartement}
          loading={loadingStats}
        />
      )}

      {/* Titre avec le nom du département sélectionné */}
      {selectedDepartement && <h1 className="fr-h3 fr-mt-3w fr-mb-3w">Statistiques {selectedDepartement.nom}</h1>}

      {error && (
        <div className="fr-alert fr-alert--error fr-mb-4w">
          <p>{error}</p>
        </div>
      )}

      {loadingStats && <p>Chargement des statistiques...</p>}

      {stats && !loadingStats && (
        <>
          {/* Bandeau info si données Matomo pas encore disponibles */}
          {!stats.matomoDataAvailable && (
            <div className="fr-alert fr-alert--info fr-mb-4w">
              <p>
                Les données de simulations (commencées / terminées) incluant les utilisateurs anonymes seront
                disponibles progressivement après la mise en place du suivi par département.
              </p>
            </div>
          )}

          {/* KPIs */}
          <div className="fr-grid-row fr-grid-row--gutters fr-mb-4w">
            <StatCard
              number={stats.simulationsCommencees.toLocaleString("fr-FR")}
              label="Simulations commencées"
              description="Adresse saisie dans le simulateur (avec et sans compte)"
              icon="fr-icon-play-circle-line"
            />
            <StatCard
              number={stats.simulationsTerminees.toLocaleString("fr-FR")}
              label="Simulations terminées"
              description="Arrivées à l'étape finale d'éligibilité"
              icon="fr-icon-check-line"
            />
            <StatCard
              number={stats.nombreComptesCreés.toLocaleString("fr-FR")}
              label="Comptes créés"
              icon="fr-icon-user-line"
            />
            <StatCard
              number={`${stats.tauxConversionSimuCompte} %`}
              label="Taux de conversion"
              description="Simulation commencée → compte créé"
              icon="fr-icon-pie-chart-2-line"
            />
          </div>

          {/* Dossiers par étape */}
          <div className="fr-mb-6w">
            <h3 className="fr-h4 fr-mb-1w">Dossiers par étape</h3>
            <p className="fr-text-mention--grey fr-mb-3w">Répartition des dossiers selon leur étape actuelle</p>
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
                <p className="fr-text-mention--grey fr-mb-3w">Motifs de non-éligibilité les plus fréquents</p>
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
                                <td colSpan={2} style={{ textAlign: "center", color: "var(--text-mention-grey)" }}>
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
                <p className="fr-text-mention--grey fr-mb-3w">Communes avec le plus de parcours</p>
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
                                <td colSpan={2} style={{ textAlign: "center", color: "var(--text-mention-grey)" }}>
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
