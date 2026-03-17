"use client";

import { useEffect, useState, useCallback } from "react";
import { FiltresTableauDeBord } from "./FiltresTableauDeBord";
import { DashboardStatCard } from "./shared/DashboardStatCard";
import { AlertesTendances } from "./alertes/AlertesTendances";
import { DemandesArchiveesCard } from "./demandes-archivees/DemandesArchiveesCard";
import {
  getTableauDeBordStatsAction,
  getDepartementsDisponiblesAction,
} from "@/features/backoffice/administration/tableau-de-bord/actions/tableau-de-bord.actions";
import { DEFAULT_PERIODE } from "@/features/backoffice/administration/tableau-de-bord/domain/types/tableau-de-bord.types";
import type {
  PeriodeId,
  TableauDeBordStats,
} from "@/features/backoffice/administration/tableau-de-bord/domain/types/tableau-de-bord.types";
import type { DepartementDisponible } from "@/features/backoffice/administration/statistiques/domain/types";

export function TableauDeBord() {
  const [periodeId, setPeriodeId] = useState<PeriodeId>(DEFAULT_PERIODE);
  const [codeDepartement, setCodeDepartement] = useState<string>("");
  const [departements, setDepartements] = useState<DepartementDisponible[]>([]);
  const [stats, setStats] = useState<TableauDeBordStats | null>(null);
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

      {/* Cartes de statistiques — fond bleu */}
      <section className="fr-container-fluid fr-py-4w bg-(--background-alt-blue-france)">
        <div className="fr-container">
          <div className="fr-grid-row fr-grid-row--gutters">
            <DashboardStatCard
              value={stats?.simulationsLancees.valeur.toLocaleString("fr-FR") ?? "..."}
              label="Simulations lancées"
              variation={stats?.simulationsLancees.variation ?? null}
              loading={loading}
              compact
            />
            <DashboardStatCard
              value={stats?.comptesCrees.valeur.toLocaleString("fr-FR") ?? "..."}
              label="Comptes créés"
              variation={stats?.comptesCrees.variation ?? null}
              loading={loading}
              compact
            />
            <DashboardStatCard
              value={stats ? `${stats.tauxTransformation.valeur.toLocaleString("fr-FR")}%` : "..."}
              label="Transfo. simu. → comptes créés"
              variation={stats?.tauxTransformation.variation ?? null}
              variationType="points"
              loading={loading}
              compact
            />
            <DashboardStatCard
              value={stats?.demandesAmoEnvoyees.valeur.toLocaleString("fr-FR") ?? "..."}
              label="Demandes AMO envoyées"
              variation={stats?.demandesAmoEnvoyees.variation ?? null}
              loading={loading}
              compact
            />
          </div>
          <div className="fr-grid-row fr-grid-row--gutters fr-mt-2w">
            <DashboardStatCard
              value={stats?.reponsesAmoEnAttente.valeur.toLocaleString("fr-FR") ?? "..."}
              label="Réponses d'AMO en attente"
              variation={stats?.reponsesAmoEnAttente.variation ?? null}
              loading={loading}
              compact
            />
            <DashboardStatCard
              value={stats?.dossiersDemarcheNumerique.valeur.toLocaleString("fr-FR") ?? "..."}
              label="Dossier Démarche Numérique"
              variation={stats?.dossiersDemarcheNumerique.variation ?? null}
              loading={loading}
              compact
            />
            <DashboardStatCard
              value={stats?.demandesArchivees.valeur.toLocaleString("fr-FR") ?? "..."}
              label="Demandes archivées"
              variation={stats?.demandesArchivees.variation ?? null}
              loading={loading}
              compact
            />
          </div>

          {/* Note sur les variations */}
          <p className="fr-mt-2w fr-text--xs" style={{ color: "#0063CB", marginBottom: 0 }}>
            <span className="fr-icon-info-fill fr-icon--sm fr-mr-1w" aria-hidden="true" />
            Les variations sont par rapport à la période précédente sélectionnée
          </p>
        </div>
      </section>

      {/* Demandes archivées — fond blanc */}
      {stats && stats.demandesArchiveesDetail.total > 0 && (
        <section className="fr-container-fluid fr-py-4w">
          <div className="fr-container">
            <div className="fr-grid-row fr-grid-row--gutters">
              <div className="fr-col-12 fr-col-lg-6">
                <DemandesArchiveesCard
                  stats={stats.demandesArchiveesDetail}
                  loading={loading}
                  periodeId={periodeId}
                  codeDepartement={codeDepartement}
                  departements={departements}
                />
              </div>
              {/* Futur : colonne pour DemandesIneligiblesCard */}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
