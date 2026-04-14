"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/features/auth/client";
import { UserRole } from "@/shared/domain/value-objects";
import { FiltresTableauDeBord } from "../../tableau-de-bord/FiltresTableauDeBord";
import {
  getTableauDeBordStatsAction,
  getMatomoSimulationsStatsAction,
  getDepartementsDisponiblesAction,
  getTopDepartementsMatomoAction,
  getTopCommunesMatomoAction,
} from "@/features/backoffice/administration/tableau-de-bord/actions/tableau-de-bord.actions";
import type {
  TableauDeBordStats,
  MatomoSimulationsStats,
  DepartementStats,
  CommuneSimulationsStats,
} from "@/features/backoffice/administration/tableau-de-bord/domain/types/tableau-de-bord.types";
import type { DepartementDisponible } from "@/features/backoffice/administration/acquisition/domain/types";
import { getStatistiquesAction } from "@/features/backoffice/administration/acquisition/actions/get-statistiques.action";
import type { Statistiques } from "@/features/backoffice/administration/acquisition/domain/types/statistiques.types";
import EntonnoirEligibilite from "./simulateur/EntonnoirEligibilite";
import DetailEtapesFunnel from "./simulateur/DetailEtapesFunnel";
import MotifsIneligibiliteCard from "./simulateur/MotifsIneligibiliteCard";
import TopSimulationsCard from "./simulateur/TopSimulationsCard";
import SiteVitrineTab from "./site-vitrine/SiteVitrineTab";
import StatistiquesDepartement from "./StatistiquesDepartement";
import { AdminBreadcrumb } from "../../shared/components/AdminBreadcrumb";
import {
  useAdministrationFiltersStore,
  selectPeriodeId,
  selectCodeDepartement,
} from "@/features/backoffice/administration/stores/administration-filters.store";

export default function AcquisitionPanel() {
  const { user } = useAuth();
  const isAnalyseDdt = user?.role === UserRole.ANALYSTE_DDT;

  const periodeId = useAdministrationFiltersStore(selectPeriodeId);
  const codeDepartement = useAdministrationFiltersStore(selectCodeDepartement);
  const setPeriodeId = useAdministrationFiltersStore((s) => s.setPeriodeId);
  const setCodeDepartement = useAdministrationFiltersStore((s) => s.setCodeDepartement);
  const [departements, setDepartements] = useState<DepartementDisponible[]>([]);
  const [stats, setStats] = useState<TableauDeBordStats | null>(null);
  const [matomoSimuStats, setMatomoSimuStats] = useState<MatomoSimulationsStats | null>(null);
  const [matomoLoaded, setMatomoLoaded] = useState(false);
  const [topDepartementsMatomo, setTopDepartementsMatomo] = useState<DepartementStats[] | null>(null);
  const [topDeptsLoading, setTopDeptsLoading] = useState(true);
  const [topCommunesMatomo, setTopCommunesMatomo] = useState<CommuneSimulationsStats[] | null>(null);
  const [topCommunesLoading, setTopCommunesLoading] = useState(true);
  const [matomoStats, setMatomoStats] = useState<Statistiques | null>(null);
  const [loading, setLoading] = useState(true);
  const [funnelLoading, setFunnelLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"simulateur" | "vitrine">("simulateur");

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

  // Charger les donnees Matomo (funnel + visites + taux rebond) quand la periode change
  useEffect(() => {
    async function loadMatomoStats() {
      setFunnelLoading(true);
      const result = await getStatistiquesAction(periodeId);
      if (result.success) {
        setMatomoStats(result.data);
      }
      setFunnelLoading(false);
    }
    loadMatomoStats();
  }, [periodeId]);

  // Charger les stats BDD (rapide) quand les filtres changent
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

  // Charger les stats Matomo simulations (lent, asynchrone) quand les filtres changent
  useEffect(() => {
    let cancelled = false;
    setMatomoSimuStats(null);
    setMatomoLoaded(false);

    async function loadMatomoSimu() {
      const result = await getMatomoSimulationsStatsAction(periodeId, codeDepartement || undefined);
      if (!cancelled) {
        if (result.success) {
          setMatomoSimuStats(result.data);
        }
        setMatomoLoaded(true);
      }
    }

    loadMatomoSimu();
    return () => {
      cancelled = true;
    };
  }, [periodeId, codeDepartement]);

  // Charger le top departements Matomo (simulations toutes sources) quand les filtres changent
  useEffect(() => {
    let cancelled = false;
    setTopDepartementsMatomo(null);
    setTopDeptsLoading(true);

    async function loadTopDepts() {
      const result = await getTopDepartementsMatomoAction(periodeId, codeDepartement || undefined);
      if (!cancelled) {
        if (result.success) {
          setTopDepartementsMatomo(result.data);
        }
        setTopDeptsLoading(false);
      }
    }

    loadTopDepts();
    return () => {
      cancelled = true;
    };
  }, [periodeId, codeDepartement]);

  // Charger le top communes Matomo quand les filtres changent
  useEffect(() => {
    let cancelled = false;
    setTopCommunesMatomo(null);
    setTopCommunesLoading(true);

    async function loadTopCommunes() {
      const result = await getTopCommunesMatomoAction(periodeId, codeDepartement || undefined);
      if (!cancelled) {
        if (result.success) {
          setTopCommunesMatomo(result.data);
        }
        setTopCommunesLoading(false);
      }
    }

    loadTopCommunes();
    return () => {
      cancelled = true;
    };
  }, [periodeId, codeDepartement]);

  // Agents DDT : vue departement uniquement
  if (isAnalyseDdt) {
    return (
      <>
        <section className="fr-container-fluid fr-py-4w">
          <div className="fr-container">
            <AdminBreadcrumb currentPageLabel="Acquisition" />
            <h1 className="fr-h2 fr-mb-1v">Acquisition</h1>
            <p className="fr-text--lg" style={{ color: "var(--text-mention-grey)", marginBottom: 0 }}>
              Statistiques par departement
            </p>
          </div>
        </section>
        <section className="fr-container-fluid fr-py-4w bg-(--background-alt-blue-france)">
          <div className="fr-container">
            <StatistiquesDepartement />
          </div>
        </section>
      </>
    );
  }

  return (
    <>
      {/* En-tete + onglets — fond blanc */}
      <section className="fr-container-fluid fr-pt-4w" style={{ borderBottom: "1px solid var(--border-default-grey)" }}>
        <div className="fr-container">
          <AdminBreadcrumb currentPageLabel="Acquisition" />
          <div className="fr-grid-row fr-grid-row--middle fr-mb-6w">
            <div className="fr-col">
              <h1 className="fr-h2 fr-mb-1v">Acquisition</h1>
              <p style={{ color: "var(--text-mention-grey)", marginBottom: 0 }}>
                Données du site et du simulateur (non éligibles et demandeurs)
              </p>
            </div>
            <div className="fr-col-auto">
              <FiltresTableauDeBord
                periodeId={periodeId}
                codeDepartement={codeDepartement}
                departements={departements}
                onPeriodeChange={setPeriodeId}
                onDepartementChange={setCodeDepartement}
                departementDisabled={activeTab === "vitrine"}
              />
            </div>
          </div>

          {/* Erreur */}
          {error && (
            <div className="fr-alert fr-alert--error">
              <p>{error}</p>
            </div>
          )}

          {/* Barre d'onglets geree par React */}
          <div className="fr-tabs" style={{ borderBottom: "none" }}>
            <ul className="fr-tabs__list" role="tablist" aria-label="Statistiques d'acquisition">
              <li role="presentation">
                <button
                  type="button"
                  className="fr-tabs__tab"
                  tabIndex={activeTab === "simulateur" ? 0 : -1}
                  role="tab"
                  aria-selected={activeTab === "simulateur"}
                  aria-controls="tab-acquisition-simulateur-panel"
                  onClick={() => setActiveTab("simulateur")}>
                  Simulateur d'eligibilite
                </button>
              </li>
              <li role="presentation">
                <button
                  type="button"
                  className="fr-tabs__tab"
                  tabIndex={activeTab === "vitrine" ? 0 : -1}
                  role="tab"
                  aria-selected={activeTab === "vitrine"}
                  aria-controls="tab-acquisition-vitrine-panel"
                  onClick={() => setActiveTab("vitrine")}>
                  Site vitrine
                </button>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* Contenu des onglets — fond bleu */}
      <section className="fr-container-fluid fr-py-4w bg-(--background-alt-blue-france)">
        <div className="fr-container">
          {activeTab === "simulateur" && (
            <div id="tab-acquisition-simulateur-panel" role="tabpanel">
              <EntonnoirEligibilite stats={stats} matomoSimuStats={matomoSimuStats} matomoLoaded={matomoLoaded} loading={loading} />
              <div className="fr-grid-row fr-grid-row--gutters fr-mt-4w">
                <div className="fr-col-12 fr-col-lg-6">
                  <DetailEtapesFunnel funnel={matomoStats?.funnelSimulateurRGA ?? null} loading={funnelLoading} />
                </div>
                <div className="fr-col-12 fr-col-lg-6">
                  <MotifsIneligibiliteCard stats={stats?.demandesIneligiblesDetail ?? null} loading={loading} />
                </div>
              </div>

              {/* Top 5 departements + communes */}
              <div className="fr-grid-row fr-grid-row--gutters fr-mt-4w">
                <div className="fr-col-12 fr-col-lg-6">
                  <TopSimulationsCard
                    title="Top 5 simulations par departement"
                    columnLabel="Departements"
                    tooltip="Données Matomo (toutes simulations, y compris anonymes)"
                    rows={
                      topDepartementsMatomo
                        ?.sort((a, b) => b.simulations - a.simulations)
                        .slice(0, 5)
                        .map((d) => ({
                          label: `${d.codeDepartement} ${d.nomDepartement}`,
                          simulations: d.simulations,
                        })) ?? []
                    }
                    loading={topDeptsLoading}
                  />
                </div>
                <div className="fr-col-12 fr-col-lg-6">
                  <TopSimulationsCard
                    title="Top 5 simulations par communes"
                    columnLabel="Communes"
                    tooltip="Données Matomo (toutes simulations, y compris anonymes)"
                    rows={
                      topCommunesMatomo?.map((c) => ({
                        label: c.commune,
                        simulations: c.simulations,
                      })) ?? []
                    }
                    loading={topCommunesLoading}
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === "vitrine" && (
            <div id="tab-acquisition-vitrine-panel" role="tabpanel">
              <SiteVitrineTab stats={matomoStats} loading={funnelLoading} />
            </div>
          )}
        </div>
      </section>
    </>
  );
}
