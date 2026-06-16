"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  listAnomaliesAction,
  getDemarchesSanteAction,
} from "@/features/backoffice/administration/diagnostics/actions/diagnostics.actions";
import {
  ParcoursAnomalyType,
  PARCOURS_ANOMALY_LABELS,
  DemarcheSanteStatus,
  type AnomaliesResult,
  type AnomalyRow,
  type DemarcheSante,
} from "@/features/backoffice/administration/diagnostics/domain/diagnostics.types";
import { STEP_LABELS } from "@/shared/domain/value-objects/step.enum";
import { getDemarcheProceduresUrl, getDossierDsDemandeUrl } from "@/features/parcours/dossiers-ds/utils";
import { AdminBreadcrumb } from "../../shared/components/AdminBreadcrumb";

const TYPE_BADGE_CLASSES: Record<ParcoursAnomalyType, string> = {
  [ParcoursAnomalyType.BLOQUE]: "fr-badge--warning",
  [ParcoursAnomalyType.ORPHELIN]: "fr-badge--error",
  [ParcoursAnomalyType.SYNC_ERREUR]: "fr-badge--error",
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

const TYPE_ORDER: ParcoursAnomalyType[] = [
  ParcoursAnomalyType.BLOQUE,
  ParcoursAnomalyType.ORPHELIN,
  ParcoursAnomalyType.SYNC_ERREUR,
];

function userLabel(r: AnomalyRow): string {
  const name = [r.userPrenom, r.userNom].filter(Boolean).join(" ").trim();
  return name || r.userEmail || r.userId.slice(0, 8);
}

export default function DiagnosticsPanel() {
  const [anomalies, setAnomalies] = useState<AnomaliesResult | null>(null);
  const [sante, setSante] = useState<DemarcheSante[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<ParcoursAnomalyType | "all">("all");

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const [anoRes, santeRes] = await Promise.all([listAnomaliesAction(), getDemarchesSanteAction()]);
    if (anoRes.success) setAnomalies(anoRes.data);
    else setError(anoRes.error || "Erreur lors du chargement");
    if (santeRes.success) setSante(santeRes.data);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const visibleRows = useMemo(() => {
    if (!anomalies) return [];
    return filter === "all" ? anomalies.rows : anomalies.rows.filter((r) => r.type === filter);
  }, [anomalies, filter]);

  return (
    <>
      <section className="fr-container-fluid fr-pt-4w" style={{ borderBottom: "1px solid var(--border-default-grey)" }}>
        <div className="fr-container">
          <AdminBreadcrumb currentPageLabel="Diagnostics DN" />
          <div className="fr-grid-row fr-grid-row--middle fr-mb-4w">
            <div className="fr-col">
              <h1 className="fr-h2 fr-mb-1v">Diagnostics DN</h1>
              <p style={{ color: "var(--text-mention-grey)", marginBottom: 0 }}>
                Parcours en anomalie côté Démarches Numériques (détection en base, sans appel DN) et santé des
                démarches. Réservé aux super-administrateurs.
              </p>
            </div>
            <div className="fr-col-auto" style={{ textAlign: "right" }}>
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

          {/* Santé des démarches */}
          {sante && (
            <div className="fr-mb-4w">
              <h2 className="fr-h6 fr-mb-2v">Santé des démarches</h2>
              {sante.map((d) => {
                const a = SANTE_ALERT[d.status];
                const url = a.hasLink && d.demarcheNumber ? getDemarcheProceduresUrl(d.demarcheNumber) : null;
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

          {/* Filtres par type + compteurs */}
          {anomalies && (
            <div className="fr-mb-2w">
              <ul className="fr-tags-group">
                <li>
                  <button
                    type="button"
                    className={`fr-tag ${filter === "all" ? "fr-tag--dismiss" : ""}`}
                    aria-pressed={filter === "all"}
                    onClick={() => setFilter("all")}>
                    Tout ({anomalies.rows.length})
                  </button>
                </li>
                {TYPE_ORDER.map((t) => (
                  <li key={t}>
                    <button
                      type="button"
                      className={`fr-tag ${filter === t ? "fr-tag--dismiss" : ""}`}
                      aria-pressed={filter === t}
                      onClick={() => setFilter(t)}>
                      {PARCOURS_ANOMALY_LABELS[t].label} ({anomalies.counts[t]})
                    </button>
                  </li>
                ))}
              </ul>
              {filter !== "all" && (
                <p className="fr-text--sm fr-mt-1v" style={{ color: "var(--text-mention-grey)" }}>
                  {PARCOURS_ANOMALY_LABELS[filter].description}
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
              <p className="fr-callout__text">Aucune anomalie détectée.</p>
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
                          <th>Anomalie</th>
                          <th>Dossier DN</th>
                          <th>Âge (j)</th>
                          <th>Détail</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {visibleRows.map((r) => (
                          <tr key={`${r.type}-${r.parcoursId}`}>
                            <td>{userLabel(r)}</td>
                            <td>
                              {STEP_LABELS[r.currentStep]} / {r.currentStatus}
                            </td>
                            <td>
                              <span className={`fr-badge fr-badge--sm ${TYPE_BADGE_CLASSES[r.type]}`}>
                                {PARCOURS_ANOMALY_LABELS[r.type].label}
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
                        ))}
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
