"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  listDiagnosticsAction,
  getDemarchesSanteAction,
  probeDnSyncErrorsAction,
} from "@/features/backoffice/administration/diagnostics/actions/diagnostics.actions";
import {
  DiagnosticState,
  DIAGNOSTIC_STATE_META,
  DIAGNOSTIC_STATE_ORDER,
  DN_VERDICT_META,
  DemarcheSanteStatus,
  type DiagnosticSeverity,
  type DiagnosticsResult,
  type DiagnosticRow,
  type DemarcheSante,
} from "@/features/backoffice/administration/diagnostics/domain/diagnostics.types";
import { STEP_LABELS } from "@/shared/domain/value-objects/step.enum";
import { getDossierDsDemandeUrl } from "@/features/parcours/dossiers-ds/utils";
import { getSharedEnv } from "@/shared/config/env.config";
import { AdminBreadcrumb } from "../../shared/components/AdminBreadcrumb";

/** URL d'administration d'une démarche (back-office DN) — spécifique à l'onglet Diagnostics. */
function getDemarcheAdminUrl(demarcheNumber: number | string): string {
  const base = getSharedEnv()?.NEXT_PUBLIC_DEMARCHES_SIMPLIFIEES_BASE_URL || "https://demarche.numerique.gouv.fr";
  return `${base}/admin/procedures/${demarcheNumber}`;
}

const SEVERITY_BADGE: Record<DiagnosticSeverity, string> = {
  error: "fr-badge--error",
  warning: "fr-badge--warning",
  info: "fr-badge--info",
  success: "fr-badge--success",
};

const SANTE_ALERT: Record<DemarcheSanteStatus, { cls: string; label: string; hasLink: boolean }> = {
  [DemarcheSanteStatus.PUBLIEE]: { cls: "fr-alert--success", label: "publiée", hasLink: true },
  [DemarcheSanteStatus.NON_PUBLIEE]: {
    cls: "fr-alert--warning",
    label: "non publiée (dépôt usager bloqué)",
    hasLink: true,
  },
  [DemarcheSanteStatus.NON_DISPONIBLE]: { cls: "fr-alert--info", label: "non créée (à venir)", hasLink: false },
  [DemarcheSanteStatus.NON_CONFIGUREE]: { cls: "fr-alert--info", label: "non configurée", hasLink: false },
  [DemarcheSanteStatus.ERREUR]: { cls: "fr-alert--error", label: "erreur API", hasLink: true },
};

function userLabel(r: DiagnosticRow): string {
  const name = [r.userPrenom, r.userNom].filter(Boolean).join(" ").trim();
  return name || r.userEmail || r.userId.slice(0, 8);
}

function daysAgoLabel(d: Date | string | null): string {
  if (!d) return "";
  const n = Math.floor((Date.now() - new Date(d).getTime()) / 86_400_000);
  return n <= 0 ? "aujourd'hui" : `il y a ${n} j`;
}

export default function DiagnosticsPanel() {
  const [diagnostics, setDiagnostics] = useState<DiagnosticsResult | null>(null);
  const [sante, setSante] = useState<DemarcheSante[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<DiagnosticState | "all">("all");
  const [isProbing, setIsProbing] = useState(false);
  const [probeMsg, setProbeMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const [diagRes, santeRes] = await Promise.all([listDiagnosticsAction(), getDemarchesSanteAction()]);
    if (diagRes.success) setDiagnostics(diagRes.data);
    else setError(diagRes.error || "Erreur lors du chargement");
    if (santeRes.success) setSante(santeRes.data);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const runProbe = useCallback(async () => {
    setIsProbing(true);
    setProbeMsg(null);
    const res = await probeDnSyncErrorsAction();
    if (res.success) {
      setProbeMsg(
        `Sondage DN terminé : ${res.data.probed} dossier(s) vérifié(s)${res.data.capped ? " (plafonné)" : ""}.`
      );
      await load();
    } else {
      setError(res.error || "Erreur lors du sondage DN");
    }
    setIsProbing(false);
  }, [load]);

  const visibleRows = useMemo(() => {
    if (!diagnostics) return [];
    return filter === "all" ? diagnostics.rows : diagnostics.rows.filter((r) => r.state === filter);
  }, [diagnostics, filter]);

  return (
    <>
      <section className="fr-container-fluid fr-pt-4w" style={{ borderBottom: "1px solid var(--border-default-grey)" }}>
        <div className="fr-container">
          <AdminBreadcrumb currentPageLabel="Diagnostics DN" />
          <div className="fr-grid-row fr-grid-row--middle fr-mb-4w">
            <div className="fr-col">
              <h1 className="fr-h2 fr-mb-1v">Diagnostics DN</h1>
              <p style={{ color: "var(--text-mention-grey)", marginBottom: 0 }}>
                État Démarches Numériques du dossier de l&apos;étape courante de chaque parcours actif (détection en
                base, sans appel DN) et santé des démarches. Réservé aux super-administrateurs.
              </p>
            </div>
            <div className="fr-col-auto" style={{ textAlign: "right" }}>
              <button
                type="button"
                className="fr-btn fr-btn--secondary fr-mr-2w"
                onClick={runProbe}
                disabled={isProbing || isLoading}
                title="Interroge DN en direct pour la sous-population en sync-erreur et met à jour le verdict DN">
                <span className="fr-icon-radar-line fr-icon--sm mr-2" aria-hidden="true" />
                {isProbing ? "Sondage DN…" : "Sonder DN (erreurs)"}
              </button>
              <button type="button" className="fr-btn fr-btn--secondary" onClick={load} disabled={isLoading}>
                <span className="fr-icon-refresh-line fr-icon--sm mr-2" aria-hidden="true" />
                Rafraîchir
              </button>
            </div>
          </div>

          {error && (
            <div className="fr-alert fr-alert--error fr-mb-4w">
              <p>{error}</p>
            </div>
          )}

          {probeMsg && (
            <div className="fr-alert fr-alert--info fr-alert--sm fr-mb-4w">
              <p>{probeMsg}</p>
            </div>
          )}

          {/* Santé des démarches */}
          {sante && (
            <div className="fr-mb-4w">
              <h2 className="fr-h6 fr-mb-2v">Santé des démarches</h2>
              {sante.map((d) => {
                const a = SANTE_ALERT[d.status];
                const url = a.hasLink && d.demarcheNumber ? getDemarcheAdminUrl(d.demarcheNumber) : null;
                const showNumber = d.demarcheNumber && d.status !== DemarcheSanteStatus.NON_DISPONIBLE;
                return (
                  <div key={d.step} className={`fr-alert fr-alert--sm ${a.cls} fr-mb-2v`}>
                    <p>
                      <strong>{STEP_LABELS[d.step]}</strong> : {a.label}
                      {showNumber ? ` (#${d.demarcheNumber})` : ""}
                      {d.errorDetail ? ` — ${d.errorDetail}` : ""}
                      {url ? (
                        <>
                          {" — "}
                          <a href={url} target="_blank" rel="noopener noreferrer">
                            Ouvrir la démarche
                          </a>
                        </>
                      ) : null}
                    </p>
                  </div>
                );
              })}
              <p className="fr-text--xs fr-mt-1v" style={{ color: "var(--text-mention-grey)" }}>
                « non créée » : la démarche n&apos;existe pas encore côté Démarches Numériques (étape pas encore
                ouverte).
              </p>
            </div>
          )}

          {/* Filtres par état + compteurs (tous les états, même à 0) */}
          {diagnostics && (
            <div className="fr-mb-2w">
              <ul className="fr-tags-group">
                <li>
                  <button
                    type="button"
                    className={`fr-tag ${filter === "all" ? "fr-tag--dismiss" : ""}`}
                    aria-pressed={filter === "all"}
                    onClick={() => setFilter("all")}>
                    Tout ({diagnostics.total})
                  </button>
                </li>
                {DIAGNOSTIC_STATE_ORDER.map((s) => (
                  <li key={s}>
                    <button
                      type="button"
                      className={`fr-tag ${filter === s ? "fr-tag--dismiss" : ""}`}
                      aria-pressed={filter === s}
                      onClick={() => setFilter(s)}>
                      {DIAGNOSTIC_STATE_META[s].label} ({diagnostics.counts[s]})
                    </button>
                  </li>
                ))}
              </ul>
              {filter !== "all" && (
                <p className="fr-text--sm fr-mt-1v" style={{ color: "var(--text-mention-grey)" }}>
                  {DIAGNOSTIC_STATE_META[filter].description}
                </p>
              )}
            </div>
          )}
        </div>
      </section>

      <section className="fr-container-fluid fr-py-4w bg-(--background-alt-blue-france)">
        <div className="fr-container">
          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <div className="text-gray-500">Chargement...</div>
            </div>
          ) : visibleRows.length === 0 ? (
            <div className="fr-callout">
              <p className="fr-callout__text">Aucun parcours pour ce filtre.</p>
            </div>
          ) : (
            <div className="fr-table fr-table--bordered">
              <div className="fr-table__wrapper">
                <div className="fr-table__container">
                  <div className="fr-table__content">
                    <table>
                      <thead>
                        <tr>
                          <th>Demandeur</th>
                          <th>Étape / statut</th>
                          <th>État</th>
                          <th>Dossier DN</th>
                          <th>Verdict DN</th>
                          <th>Âge (j)</th>
                          <th>Détail</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {visibleRows.map((r) => {
                          const meta = DIAGNOSTIC_STATE_META[r.state];
                          return (
                            <tr key={`${r.state}-${r.parcoursId}`}>
                              <td>{userLabel(r)}</td>
                              <td>
                                {STEP_LABELS[r.currentStep]} / {r.currentStatus}
                              </td>
                              <td>
                                <span className={`fr-badge fr-badge--sm ${SEVERITY_BADGE[meta.severity]}`}>
                                  {meta.label}
                                </span>
                              </td>
                              <td>
                                {r.dsNumber ? (
                                  <>
                                    <a
                                      href={getDossierDsDemandeUrl(Number(r.dsNumber))}
                                      target="_blank"
                                      rel="noopener noreferrer">
                                      #{r.dsNumber}
                                    </a>{" "}
                                    ({r.dsStatus ?? "?"})
                                  </>
                                ) : (
                                  "-"
                                )}
                              </td>
                              <td style={{ fontSize: "0.8rem" }}>
                                <span
                                  className={`fr-badge fr-badge--sm ${SEVERITY_BADGE[DN_VERDICT_META[r.dnVerdict].severity]}`}>
                                  {DN_VERDICT_META[r.dnVerdict].label}
                                </span>
                                {r.dnProbeState && (
                                  <span
                                    style={{ display: "block", color: "var(--text-mention-grey)" }}
                                    title={r.dnProbeAt ? new Date(r.dnProbeAt).toLocaleString("fr-FR") : ""}>
                                    {r.dnProbeState}
                                    {r.dnProbeAt ? ` · ${daysAgoLabel(r.dnProbeAt)}` : ""}
                                  </span>
                                )}
                              </td>
                              <td>{r.ageDays ?? "-"}</td>
                              <td style={{ maxWidth: 320, fontSize: "0.8rem", color: "var(--text-mention-grey)" }}>
                                {r.detail ?? "-"}
                              </td>
                              <td>
                                <Link
                                  href={`/administration/diagnostics/${r.parcoursId}`}
                                  className="fr-btn fr-btn--secondary fr-btn--sm">
                                  Analyser
                                </Link>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
