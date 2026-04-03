"use client";

import { useEffect, useState, useCallback } from "react";
import { FiltresTableauDeBord } from "./FiltresTableauDeBord";
import { DashboardStatCard } from "./shared/DashboardStatCard";
import { AlertesTendances } from "./alertes/AlertesTendances";
import { DemandesArchiveesCard } from "./demandes-archivees/DemandesArchiveesCard";
import { DemandesIneligiblesCard } from "./demandes-ineligibles/DemandesIneligiblesCard";
import { TopDepartementsCard } from "./top-departements/TopDepartementsCard";
import {
  getTableauDeBordStatsAction,
  getMatomoSimulationsStatsAction,
  getDepartementsDisponiblesAction,
} from "@/features/backoffice/administration/tableau-de-bord/actions/tableau-de-bord.actions";
import type {
  TableauDeBordStats,
  MatomoSimulationsStats,
} from "@/features/backoffice/administration/tableau-de-bord/domain/types/tableau-de-bord.types";
import type { DepartementDisponible } from "@/features/backoffice/administration/acquisition/domain/types";
import {
  useAdministrationFiltersStore,
  selectPeriodeId,
  selectCodeDepartement,
} from "@/features/backoffice/administration/stores/administration-filters.store";

export function TableauDeBord() {
  const periodeId = useAdministrationFiltersStore(selectPeriodeId);
  const codeDepartement = useAdministrationFiltersStore(selectCodeDepartement);
  const setPeriodeId = useAdministrationFiltersStore((s) => s.setPeriodeId);
  const setCodeDepartement = useAdministrationFiltersStore((s) => s.setCodeDepartement);
  const [departements, setDepartements] = useState<DepartementDisponible[]>([]);
  const [stats, setStats] = useState<TableauDeBordStats | null>(null);
  const [matomoSimuStats, setMatomoSimuStats] = useState<MatomoSimulationsStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Charger les departements au montage
  useEffect(() => {
    async function loadDepartements() {
      const result = await getDepartementsDisponiblesAction();
      if (result.success) {
        setDepartements(result.data);
      }
    }
    loadDepartements();
  }, []);

  // Charger les stats quand les filtres changent
  const loadStats = useCallback(async () => {
    setLoading(true);
    setError(null);

    const result = await getTableauDeBordStatsAction(periodeId, codeDepartement || undefined);

    if (result.success) {
      setStats(result.data);
    } else {
      setError(result.error);
    }

    setLoading(false);
  }, [periodeId, codeDepartement]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  // Charger les stats Matomo simulations (lent, asynchrone)
  useEffect(() => {
    let cancelled = false;
    setMatomoSimuStats(null);

    async function loadMatomoSimu() {
      const result = await getMatomoSimulationsStatsAction(periodeId, codeDepartement || undefined);
      if (!cancelled && result.success && result.data.simulationsMatomo.valeur > 0) {
        setMatomoSimuStats(result.data);
      }
    }

    loadMatomoSimu();
    return () => {
      cancelled = true;
    };
  }, [periodeId, codeDepartement]);

  // Utiliser Matomo si disponible, sinon BDD
  const simulationsValue = matomoSimuStats?.simulationsMatomo ?? stats?.simulationsLancees;
  const tauxValue = matomoSimuStats?.tauxTransformation ?? stats?.tauxTransformation;

  return (
    <>
      {/* En-tête + filtres — fond blanc */}
      <section className="fr-container-fluid fr-py-4w">
        <div className="fr-container">
          <div className="fr-grid-row fr-grid-row--middle fr-mb-2w">
            <div className="fr-col">
              <h1 className="fr-h2 fr-mb-1v">Tableau de bord</h1>
              <p className="fr-text--lg" style={{ color: "var(--text-mention-grey)", marginBottom: 0 }}>
                Pilotage du Fonds RGA
              </p>
            </div>
            <div className="fr-col-auto">
              <FiltresTableauDeBord
                periodeId={periodeId}
                codeDepartement={codeDepartement}
                departements={departements}
                onPeriodeChange={setPeriodeId}
                onDepartementChange={setCodeDepartement}
              />
            </div>
          </div>

          {/* Erreur */}
          {error && (
            <div className="fr-alert fr-alert--error">
              <p>{error}</p>
            </div>
          )}
        </div>
      </section>

      {/* Alerte tendances */}
      {stats && stats.alertes.length > 0 && <AlertesTendances alertes={stats.alertes} />}

      {/* Stats + détails + top départements — fond bleu */}
      <section className="fr-container-fluid fr-py-4w bg-(--background-alt-blue-france)">
        <div className="fr-container">
          <div className="fr-grid-row fr-grid-row--gutters">
            <DashboardStatCard
              value={simulationsValue?.valeur.toLocaleString("fr-FR") ?? "..."}
              label="Simulations terminees"
              variation={simulationsValue?.variation ?? null}
              loading={loading}
              compact
              tooltip="Données Matomo, fallback base de données"
            />
            <DashboardStatCard
              value={stats?.comptesCrees.valeur.toLocaleString("fr-FR") ?? "..."}
              label="Comptes créés"
              variation={stats?.comptesCrees.variation ?? null}
              loading={loading}
              compact
              tooltip="Données base de données"
            />
            <DashboardStatCard
              value={tauxValue ? `${tauxValue.valeur.toLocaleString("fr-FR")}%` : "..."}
              label="Transfo. simu. → comptes créés"
              variation={tauxValue?.variation ?? null}
              variationType="points"
              loading={loading}
              compact
              tooltip="Calculé : comptes créés / simulations terminées (Matomo)"
            />
            <DashboardStatCard
              value={stats?.demandesAmoEnvoyees.valeur.toLocaleString("fr-FR") ?? "..."}
              label="Demandes AMO envoyées"
              variation={stats?.demandesAmoEnvoyees.variation ?? null}
              loading={loading}
              compact
              tooltip="Données base de données"
            />
          </div>
          <div className="fr-grid-row fr-grid-row--gutters fr-mt-2w">
            <DashboardStatCard
              value={stats?.reponsesAmoEnAttente.valeur.toLocaleString("fr-FR") ?? "..."}
              label="Réponses d'AMO en attente"
              variation={stats?.reponsesAmoEnAttente.variation ?? null}
              loading={loading}
              compact
              tooltip="Données base de données"
            />
            <DashboardStatCard
              value={stats?.dossiersDemarcheNumerique.valeur.toLocaleString("fr-FR") ?? "..."}
              label="Dossier Démarche Numérique"
              variation={stats?.dossiersDemarcheNumerique.variation ?? null}
              loading={loading}
              compact
              tooltip="Données base de données"
            />
            <DashboardStatCard
              value={stats?.demandesArchivees.valeur.toLocaleString("fr-FR") ?? "..."}
              label="Demandes archivées"
              variation={stats?.demandesArchivees.variation ?? null}
              loading={loading}
              compact
              tooltip="Données base de données"
            />
          </div>

          {/* Note sur les variations */}
          <p className="fr-mt-2w fr-text--xs" style={{ color: "#0063CB", marginBottom: 0 }}>
            <span className="fr-icon-info-fill fr-icon--sm fr-mr-1w" aria-hidden="true" />
            Les variations sont par rapport à la période précédente sélectionnée
          </p>

          {/* Demandes archivées + inéligibles */}
          {stats && (stats.demandesArchiveesDetail.total > 0 || stats.demandesIneligiblesDetail.total > 0) && (
            <div className="fr-grid-row fr-grid-row--gutters fr-mt-4w">
              {stats.demandesArchiveesDetail.total > 0 && (
                <div className="fr-col-12 fr-col-lg-6">
                  <DemandesArchiveesCard
                    stats={stats.demandesArchiveesDetail}
                    loading={loading}
                    periodeId={periodeId}
                    codeDepartement={codeDepartement}
                    departements={departements}
                  />
                </div>
              )}
              {stats.demandesIneligiblesDetail.total > 0 && (
                <div className="fr-col-12 fr-col-lg-6">
                  <DemandesIneligiblesCard stats={stats.demandesIneligiblesDetail} loading={loading} />
                </div>
              )}
            </div>
          )}

          {/* Top 5 départements */}
          {stats && stats.topDepartements.length > 0 && (
            <div className="fr-grid-row fr-grid-row--gutters fr-mt-4w">
              <div className="fr-col-12">
                <TopDepartementsCard departements={stats.topDepartements} loading={loading} />
              </div>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
