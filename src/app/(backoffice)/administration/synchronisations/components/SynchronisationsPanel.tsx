"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import Link from "next/link";
import {
  listSyncRunsAction,
  triggerManualSyncAction,
} from "@/features/backoffice/administration/synchronisations/actions";
import { SyncRunStatus, SyncRunTrigger } from "@/shared/domain/value-objects/sync-run-status.enum";
import type { SyncRun } from "@/shared/database/schema/sync-runs";
import { AdminBreadcrumb } from "../../shared/components/AdminBreadcrumb";

const PAGE_SIZE = 20;

const STATUS_LABELS: Record<SyncRunStatus, string> = {
  [SyncRunStatus.SUCCESS]: "Succès",
  [SyncRunStatus.PARTIAL]: "Partiel",
  [SyncRunStatus.ERROR]: "Erreur",
};

const STATUS_BADGE_CLASSES: Record<SyncRunStatus, string> = {
  [SyncRunStatus.SUCCESS]: "fr-badge--success",
  [SyncRunStatus.PARTIAL]: "fr-badge--warning",
  [SyncRunStatus.ERROR]: "fr-badge--error",
};

const TRIGGER_LABELS: Record<SyncRunTrigger, string> = {
  [SyncRunTrigger.CRON]: "CRON",
  [SyncRunTrigger.MANUAL]: "Manuel",
};

function formatDate(date: Date | null): string {
  if (!date) return "-";
  const d = new Date(date);
  return d.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function formatDuration(start: Date, end: Date | null): string {
  if (!end) return "en cours";
  const ms = new Date(end).getTime() - new Date(start).getTime();
  if (ms < 1000) return `${ms} ms`;
  const seconds = Math.round(ms / 1000);
  if (seconds < 60) return `${seconds} s`;
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${minutes} min ${rest} s`;
}

export default function SynchronisationsPanel() {
  const [runs, setRuns] = useState<SyncRun[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isTriggering, startTriggerTransition] = useTransition();

  const loadRuns = useCallback(async (targetPage: number) => {
    setIsLoading(true);
    setError(null);
    const result = await listSyncRunsAction(targetPage, PAGE_SIZE);
    if (result.success) {
      setRuns(result.data.data);
      setTotalPages(result.data.totalPages);
      setTotal(result.data.total);
      setPage(result.data.page);
    } else {
      setError(result.error || "Erreur lors du chargement");
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadRuns(1);
  }, [loadRuns]);

  const handleTrigger = () => {
    setFeedback(null);
    setError(null);
    startTriggerTransition(async () => {
      const result = await triggerManualSyncAction();
      if (!result.success) {
        setError(result.error || "Erreur lors du déclenchement");
        return;
      }
      setFeedback(
        `Synchro lancée : ${result.data.totalScanned} scannés, ${result.data.totalUpdated} mis à jour, ${result.data.totalErrors} erreurs.`
      );
      await loadRuns(1);
    });
  };

  return (
    <>
      <section
        className="fr-container-fluid fr-pt-4w"
        style={{ borderBottom: "1px solid var(--border-default-grey)" }}>
        <div className="fr-container">
          <AdminBreadcrumb currentPageLabel="Synchronisations" />
          <div className="fr-grid-row fr-grid-row--middle fr-mb-6w">
            <div className="fr-col">
              <h1 className="fr-h2 fr-mb-1v">Synchronisations</h1>
              <p style={{ color: "var(--text-mention-grey)", marginBottom: 0 }}>
                Historique des runs CRON synchronisant les dossiers Démarches Simplifiées et faisant progresser les
                parcours.
              </p>
            </div>
            <div className="fr-col-auto">
              <button
                type="button"
                className="fr-btn"
                onClick={handleTrigger}
                disabled={isTriggering}>
                <span className="fr-icon-refresh-line fr-icon--sm mr-2" aria-hidden="true" />
                {isTriggering ? "Synchro en cours..." : "Lancer une synchro maintenant"}
              </button>
            </div>
          </div>

          {feedback && (
            <div className="fr-alert fr-alert--success fr-mb-4w">
              <p>{feedback}</p>
            </div>
          )}
          {error && (
            <div className="fr-alert fr-alert--error fr-mb-4w">
              <p>{error}</p>
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
          ) : runs.length === 0 ? (
            <div className="fr-callout">
              <p className="fr-callout__text">Aucun run pour le moment.</p>
            </div>
          ) : (
            <>
              <div className="fr-table fr-table--bordered">
                <div className="fr-table__wrapper">
                  <div className="fr-table__container">
                    <div className="fr-table__content">
                      <table>
                        <thead>
                          <tr>
                            <th>Date</th>
                            <th>Durée</th>
                            <th>Statut</th>
                            <th>Trigger</th>
                            <th>Scannés</th>
                            <th>Mis à jour</th>
                            <th>Erreurs</th>
                            <th>Détail</th>
                          </tr>
                        </thead>
                        <tbody>
                          {runs.map((run) => {
                            const status = run.status as SyncRunStatus | null;
                            return (
                              <tr key={run.id}>
                                <td>{formatDate(run.startedAt)}</td>
                                <td>{formatDuration(run.startedAt, run.finishedAt)}</td>
                                <td>
                                  {status ? (
                                    <span className={`fr-badge fr-badge--sm ${STATUS_BADGE_CLASSES[status]}`}>
                                      {STATUS_LABELS[status]}
                                    </span>
                                  ) : (
                                    <span className="fr-badge fr-badge--sm fr-badge--info">En cours</span>
                                  )}
                                </td>
                                <td>{TRIGGER_LABELS[run.triggeredBy as SyncRunTrigger]}</td>
                                <td>{run.totalParcoursScanned}</td>
                                <td>{run.totalParcoursUpdated}</td>
                                <td>{run.totalErrors}</td>
                                <td>
                                  <Link
                                    href={`/administration/synchronisations/${run.id}`}
                                    className="fr-btn fr-btn--secondary fr-btn--sm">
                                    Voir
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

              {totalPages > 1 && (
                <nav role="navigation" className="fr-pagination fr-mt-4w" aria-label="Pagination">
                  <ul className="fr-pagination__list">
                    <li>
                      <button
                        type="button"
                        className="fr-pagination__link fr-pagination__link--prev"
                        disabled={page <= 1}
                        onClick={() => loadRuns(page - 1)}>
                        Précédent
                      </button>
                    </li>
                    <li>
                      <span className="fr-pagination__link" aria-current="page">
                        Page {page} / {totalPages} ({total} runs)
                      </span>
                    </li>
                    <li>
                      <button
                        type="button"
                        className="fr-pagination__link fr-pagination__link--next"
                        disabled={page >= totalPages}
                        onClick={() => loadRuns(page + 1)}>
                        Suivant
                      </button>
                    </li>
                  </ul>
                </nav>
              )}
            </>
          )}
        </div>
      </section>
    </>
  );
}
