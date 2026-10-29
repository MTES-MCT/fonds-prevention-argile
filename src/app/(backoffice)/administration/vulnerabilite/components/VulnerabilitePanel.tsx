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
  getVulnerabiliteComptesStatsAction,
} from "@/features/backoffice/administration/vulnerabilite/actions/vulnerabilite-stats.actions";
import {
  PERIODES,
  DEFAULT_PERIODE,
} from "@/features/backoffice/administration/tableau-de-bord/domain/types/tableau-de-bord.types";
import type { PeriodeId } from "@/features/backoffice/administration/tableau-de-bord/domain/types/tableau-de-bord.types";
import type {
  CritereReponsesStats,
  VulnerabiliteComptesStats,
  VulnerabilitePointsMoyens,
  VulnerabiliteTopDepartement,
} from "@/features/backoffice/administration/vulnerabilite/domain/types/vulnerabilite-stats.types";
import type { FunnelStatistiques } from "@/features/backoffice/administration/acquisition/domain/types/matomo-funnels.types";
import {
  CATEGORIES_AFFICHAGE,
  type CategorieAffichee,
} from "@/features/vulnerabilite-rga/domain/value-objects/grille-categorisation";

const AUTRES_CATEGORIES: CategorieAffichee[] = ["vigilance", "a_verifier", "bonne_pratique"];

function libelleComptes(comptes: VulnerabiliteComptesStats | null): string {
  if (!comptes || comptes.totalComptes === 0) return "Comptes ayant fait une simulation";
  const part = Math.round((comptes.comptesAvecSimulation / comptes.totalComptes) * 1000) / 10;
  return `Comptes ayant fait une simulation (${part.toLocaleString("fr-FR")} % des ${comptes.totalComptes.toLocaleString("fr-FR")} comptes)`;
}

function formaterMoyenne(valeur: number | null | undefined): string {
  return valeur === null || valeur === undefined ? "—" : valeur.toLocaleString("fr-FR");
}

/**
 * Onglet "Vulnérabilité" — mesure l'usage et l'impact du simulateur `/vulnerabilite-rga`.
 * Filtre période uniquement (stats nationales, pas de filtre département : la répartition
 * géographique est elle-même un des widgets affichés).
 */
export default function VulnerabilitePanel() {
  const [periodeId, setPeriodeId] = useState<PeriodeId>(DEFAULT_PERIODE);

  const [totalSimulations, setTotalSimulations] = useState<number | null>(null);
  const [reponses, setReponses] = useState<CritereReponsesStats[]>([]);
  const [pointsMoyens, setPointsMoyens] = useState<VulnerabilitePointsMoyens | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [topDepartements, setTopDepartements] = useState<VulnerabiliteTopDepartement[] | null>(null);
  const [topDeptsLoading, setTopDeptsLoading] = useState(true);

  const [comptes, setComptes] = useState<VulnerabiliteComptesStats | null>(null);
  const [comptesLoading, setComptesLoading] = useState(true);

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
        setPointsMoyens(result.data.pointsMoyens);
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

  // Stock depuis le lancement : pas de dependance a periodeId.
  useEffect(() => {
    let cancelled = false;

    async function load() {
      const result = await getVulnerabiliteComptesStatsAction();
      if (!cancelled) {
        if (result.success) setComptes(result.data);
        setComptesLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

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
              value={formaterMoyenne(pointsMoyens?.critique)}
              label="Points critiques par simulation (moyenne)"
              variation={null}
              loading={statsLoading}
              tooltip="Nombre moyen de réponses classées « Point critique » par simulation terminée sur la période, selon la grille de catégorisation en vigueur"
              className="fr-col-12 fr-col-md-6 fr-col-lg-3"
            />
            <DashboardStatCard
              value={comptes === null ? "…" : comptes.comptesAvecSimulation.toLocaleString("fr-FR")}
              label={libelleComptes(comptes)}
              variation={null}
              loading={comptesLoading}
              tooltip="Comptes du parcours rattachés à une simulation de vulnérabilité, faite par le demandeur ou par un agent avec lui. Depuis le lancement, indépendamment de la période choisie"
              className="fr-col-12 fr-col-md-6 fr-col-lg-3"
            />
          </div>

          <div className="fr-grid-row fr-grid-row--gutters fr-mt-2w">
            {AUTRES_CATEGORIES.map((categorie) => (
              <DashboardStatCard
                key={categorie}
                value={formaterMoyenne(pointsMoyens?.[categorie])}
                label={`${CATEGORIES_AFFICHAGE[categorie].pluriel} par simulation (moyenne)`}
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
