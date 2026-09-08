"use client";

import { useEffect, useState } from "react";
import { AdminBreadcrumb } from "../../shared/components/AdminBreadcrumb";
import { DashboardStatCard } from "@/app/(backoffice)/administration/tableau-de-bord/shared/DashboardStatCard";
import DetailEtapesFunnel from "@/app/(backoffice)/administration/acquisition/components/simulateur/DetailEtapesFunnel";
import TopSimulationsCard from "@/app/(backoffice)/administration/acquisition/components/simulateur/TopSimulationsCard";
import { RepartitionReponseCard } from "./RepartitionReponseCard";
import {
  getVulnerabiliteStatsAction,
  getVulnerabiliteTopDepartementsAction,
  getVulnerabiliteFunnelAction,
} from "@/features/backoffice/administration/vulnerabilite/actions/vulnerabilite-stats.actions";
import {
  PERIODES,
  DEFAULT_PERIODE,
} from "@/features/backoffice/administration/tableau-de-bord/domain/types/tableau-de-bord.types";
import type { PeriodeId } from "@/features/backoffice/administration/tableau-de-bord/domain/types/tableau-de-bord.types";
import type {
  CritereReponsesStats,
  VulnerabiliteScoreMoyen,
  VulnerabiliteTopDepartement,
} from "@/features/backoffice/administration/vulnerabilite/domain/types/vulnerabilite-stats.types";
import type { FunnelStatistiques } from "@/features/backoffice/administration/acquisition/domain/types/matomo-funnels.types";
import { CATEGORIES_CONFIG } from "@/features/vulnerabilite-rga/domain/value-objects/grille-ponderation";

/**
 * Onglet "Vulnérabilité" — mesure l'usage et l'impact du simulateur `/vulnerabilite-rga`.
 * Filtre période uniquement (stats nationales, pas de filtre département : la répartition
 * géographique est elle-même un des widgets affichés).
 */
export default function VulnerabilitePanel() {
  const [periodeId, setPeriodeId] = useState<PeriodeId>(DEFAULT_PERIODE);

  const [totalSimulations, setTotalSimulations] = useState<number | null>(null);
  const [reponses, setReponses] = useState<CritereReponsesStats[]>([]);
  const [scoreMoyen, setScoreMoyen] = useState<VulnerabiliteScoreMoyen | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [topDepartements, setTopDepartements] = useState<VulnerabiliteTopDepartement[] | null>(null);
  const [topDeptsLoading, setTopDeptsLoading] = useState(true);

  const [funnel, setFunnel] = useState<FunnelStatistiques | null>(null);
  const [funnelLoading, setFunnelLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setStatsLoading(true);
    setError(null);

    async function load() {
      const result = await getVulnerabiliteStatsAction(periodeId);
      if (cancelled) return;
      if (result.success) {
        setTotalSimulations(result.data.totalSimulations);
        setReponses(result.data.reponses);
        setScoreMoyen(result.data.scoreMoyen);
      } else {
        setError(result.error);
      }
      setStatsLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [periodeId]);

  useEffect(() => {
    let cancelled = false;
    setTopDeptsLoading(true);

    async function load() {
      const result = await getVulnerabiliteTopDepartementsAction(periodeId);
      if (!cancelled) {
        if (result.success) setTopDepartements(result.data);
        setTopDeptsLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [periodeId]);

  // Fixé sur les 7 derniers jours cote service (limite API Matomo Funnels) : pas de dependance a periodeId.
  useEffect(() => {
    let cancelled = false;
    setFunnelLoading(true);

    async function load() {
      const result = await getVulnerabiliteFunnelAction();
      if (!cancelled) {
        if (result.success) setFunnel(result.data);
        setFunnelLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <>
      <section className="fr-container-fluid fr-pt-4w" style={{ borderBottom: "1px solid var(--border-default-grey)" }}>
        <div className="fr-container">
          <AdminBreadcrumb currentPageLabel="Vulnérabilité" />
          <div className="fr-grid-row fr-grid-row--middle fr-mb-6w">
            <div className="fr-col">
              <h1 className="fr-h2 fr-mb-1v">Vulnérabilité</h1>
              <p style={{ color: "var(--text-mention-grey)", marginBottom: 0 }}>
                Usage et impact du simulateur de vulnérabilité RGA
              </p>
            </div>
            <div className="fr-col-auto">
              <div className="fr-select-group">
                <select
                  className="fr-select"
                  id="filtre-periode-vulnerabilite"
                  name="periode"
                  value={periodeId}
                  onChange={(e) => setPeriodeId(e.target.value as PeriodeId)}
                  aria-label="Période d'analyse">
                  {PERIODES.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {error && (
            <div className="fr-alert fr-alert--error">
              <p>{error}</p>
            </div>
          )}
        </div>
      </section>

      <section className="fr-container-fluid fr-py-4w bg-(--background-alt-blue-france)">
        <div className="fr-container">
          <div className="fr-grid-row fr-grid-row--gutters">
            <DashboardStatCard
              value={totalSimulations === null ? "…" : totalSimulations.toLocaleString("fr-FR")}
              label="Simulations réalisées"
              variation={null}
              loading={statsLoading}
              tooltip="Nombre de simulations de vulnérabilité menées jusqu'au résultat sur la période"
              className="fr-col-12 fr-col-md-6 fr-col-lg-3"
            />
            <DashboardStatCard
              value={scoreMoyen?.global === null || scoreMoyen === null ? "—" : String(scoreMoyen.global)}
              label="Score de vulnérabilité moyen (/100)"
              variation={null}
              loading={statsLoading}
              tooltip="Score global moyen des simulations terminées sur la période — 0 = risque minimal, 100 = risque maximal"
              className="fr-col-12 fr-col-md-6 fr-col-lg-3"
            />
          </div>

          <div className="fr-grid-row fr-grid-row--gutters fr-mt-2w">
            {CATEGORIES_CONFIG.map((categorie) => (
              <DashboardStatCard
                key={categorie.id}
                value={
                  scoreMoyen === null || scoreMoyen.parCategorie[categorie.id] === null
                    ? "—"
                    : String(scoreMoyen.parCategorie[categorie.id])
                }
                label={categorie.label}
                variation={null}
                loading={statsLoading}
                compact
                className="fr-col-6 fr-col-md-3"
              />
            ))}
          </div>

          <div className="fr-grid-row fr-grid-row--gutters fr-mt-4w">
            <div className="fr-col-12 fr-col-lg-6">
              <DetailEtapesFunnel funnel={funnel} loading={funnelLoading} />
            </div>
            <div className="fr-col-12 fr-col-lg-6">
              <TopSimulationsCard
                title="Simulations par département"
                columnLabel="Départements"
                tooltip="Données Matomo (résultat de la simulation de vulnérabilité, toutes visites y compris anonymes)"
                rows={(topDepartements ?? [])
                  .map((d) => ({ label: `${d.codeDepartement} ${d.nomDepartement}`, simulations: d.simulations }))
                  .slice(0, 20)}
                loading={topDeptsLoading}
              />
            </div>
          </div>

          <h2 className="fr-h4 fr-mt-6w fr-mb-2w">Répartition des réponses par question</h2>
          <div className="fr-grid-row fr-grid-row--gutters">
            {reponses.map((stat) => (
              <div key={stat.critereId} className="fr-col-12 fr-col-md-6 fr-col-lg-4">
                <RepartitionReponseCard stats={stat} loading={statsLoading} />
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
