"use client";

import { useEffect, useState, useCallback } from "react";
import { FiltresTableauDeBord } from "../../tableau-de-bord/FiltresTableauDeBord";
import { DashboardStatCard } from "../../tableau-de-bord/shared/DashboardStatCard";
import { AdminBreadcrumb } from "../../shared/components/AdminBreadcrumb";
import { ActiviteParTypeTable } from "./ActiviteParTypeTable";
import { getDepartementsDisponiblesAction } from "@/features/backoffice/administration/tableau-de-bord/actions/tableau-de-bord.actions";
import { getActiviteStatsAction } from "@/features/backoffice/administration/activite/actions/activite.actions";
import type { DepartementDisponible } from "@/features/backoffice/administration/acquisition/domain/types";
import type { ActiviteStats } from "@/features/backoffice/administration/activite/domain/types/activite.types";
import {
  useAdministrationFiltersStore,
  selectPeriodeId,
  selectCodeDepartement,
} from "@/features/backoffice/administration/stores/administration-filters.store";

export default function ActivitePanel() {
  const periodeId = useAdministrationFiltersStore(selectPeriodeId);
  const codeDepartement = useAdministrationFiltersStore(selectCodeDepartement);
  const setPeriodeId = useAdministrationFiltersStore((s) => s.setPeriodeId);
  const setCodeDepartement = useAdministrationFiltersStore((s) => s.setCodeDepartement);
  const [departements, setDepartements] = useState<DepartementDisponible[]>([]);
  const [stats, setStats] = useState<ActiviteStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadDepartements() {
      const result = await getDepartementsDisponiblesAction();
      if (result.success) {
        setDepartements(result.data);
      }
    }
    loadDepartements();
  }, []);

  const loadStats = useCallback(async () => {
    setLoading(true);
    setError(null);

    const result = await getActiviteStatsAction(periodeId, codeDepartement || undefined);

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
      <section className="fr-container-fluid fr-pt-4w" style={{ borderBottom: "1px solid var(--border-default-grey)" }}>
        <div className="fr-container">
          <AdminBreadcrumb currentPageLabel="Activité" />
          <div className="fr-grid-row fr-grid-row--middle fr-mb-6w">
            <div className="fr-col">
              <h1 className="fr-h2 fr-mb-1v">Activité</h1>
              <p style={{ color: "var(--text-mention-grey)", marginBottom: 0 }}>
                Nombre d&apos;actions réalisées par les agents, par type
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

          {error && (
            <div className="fr-alert fr-alert--error">
              <p>{error}</p>
            </div>
          )}
        </div>
      </section>

      {/* Contenu — fond bleu */}
      <section className="fr-container-fluid fr-py-4w bg-(--background-alt-blue-france)">
        <div className="fr-container">
          <div className="fr-grid-row fr-grid-row--gutters fr-mb-4w">
            <DashboardStatCard
              className="fr-col-12 fr-col-md-6"
              value={stats?.total.valeur.toLocaleString("fr-FR") ?? "..."}
              label="Total des actions enregistrées"
              variation={stats?.total.variation ?? null}
              loading={loading}
              tooltip="Données base de données (parcours_actions)"
            />
            <DashboardStatCard
              className="fr-col-12 fr-col-md-6"
              value={stats?.demandeursDistincts.valeur.toLocaleString("fr-FR") ?? "..."}
              label="Demandeurs distincts concernés"
              variation={stats?.demandeursDistincts.variation ?? null}
              loading={loading}
              tooltip="Nombre de demandeurs distincts sur lesquels au moins une action a été réalisée (parcours_actions × parcours_prevention)"
            />
          </div>

          <h2 className="fr-h6 fr-mb-2w">Répartition par type d&apos;action</h2>
          <ActiviteParTypeTable rows={stats?.parType ?? []} loading={loading} />
        </div>
      </section>
    </>
  );
}
