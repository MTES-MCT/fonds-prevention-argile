"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { getSyncRunDetailAction } from "@/features/backoffice/administration/synchronisations/actions";
import {
  SyncRunStatus,
  SyncRunTrigger,
} from "@/shared/domain/value-objects/sync-run-status.enum";
import type { SyncRunDetail } from "@/shared/database/repositories/sync-run.repository";
import type { DsStatusChange } from "@/shared/database/schema/sync-run-entries";
import { DS_STATUS_LABELS } from "@/features/parcours/dossiers-ds/domain/value-objects/ds-status";
import { STEP_LABELS } from "@/shared/domain/value-objects/step.enum";
import type { Step } from "@/shared/domain/value-objects/step.enum";
import type { Status } from "@/shared/domain/value-objects/status.enum";

const STATUS_LABELS_RUN: Record<SyncRunStatus, string> = {
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

const PARCOURS_STATUS_LABELS: Record<Status, string> = {
  todo: "À faire",
  en_instruction: "En instruction",
  valide: "Validé",
} as Record<Status, string>;

function formatDate(date: Date | null): string {
  if (!date) return "-";
  return new Date(date).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function renderStepTransition(before: Step | null, after: Step | null): string {
  if (!before && !after) return "-";
  if (before === after) return STEP_LABELS[before as Step] ?? "-";
  return `${before ? STEP_LABELS[before as Step] : "-"} → ${after ? STEP_LABELS[after as Step] : "-"}`;
}

function renderStatusTransition(before: Status | null, after: Status | null): string {
  if (!before && !after) return "-";
  if (before === after) return PARCOURS_STATUS_LABELS[before as Status] ?? "-";
  return `${before ? PARCOURS_STATUS_LABELS[before as Status] : "-"} → ${after ? PARCOURS_STATUS_LABELS[after as Status] : "-"}`;
}

function renderDsChanges(changes: DsStatusChange[] | null): string {
  if (!changes || changes.length === 0) return "-";
  return changes
    .map(
      (c) =>
        `${STEP_LABELS[c.step]} : ${DS_STATUS_LABELS[c.oldDsStatus]} → ${DS_STATUS_LABELS[c.newDsStatus]}`
    )
    .join("\n");
}

interface Props {
  runId: string;
}

export default function SyncRunDetailPanel({ runId }: Props) {
  const [detail, setDetail] = useState<SyncRunDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const result = await getSyncRunDetailAction(runId);
    if (result.success) {
      setDetail(result.data);
    } else {
      setError(result.error || "Erreur lors du chargement");
    }
    setIsLoading(false);
  }, [runId]);

  useEffect(() => {
    load();
  }, [load]);

  if (isLoading) {
    return (
      <section className="fr-container fr-py-4w">
        <div className="text-gray-500">Chargement...</div>
      </section>
    );
  }

  if (error || !detail) {
    return (
      <section className="fr-container fr-py-4w">
        <div className="fr-alert fr-alert--error">
          <p>{error || "Synchro introuvable"}</p>
        </div>
        <Link className="fr-btn fr-btn--secondary fr-mt-4w" href="/administration/synchronisations">
          Retour
        </Link>
      </section>
    );
  }

  const { run, entries } = detail;
  const status = run.status as SyncRunStatus | null;

  return (
    <>
      <section
        className="fr-container-fluid fr-pt-4w"
        style={{ borderBottom: "1px solid var(--border-default-grey)" }}>
        <div className="fr-container">
          <nav role="navigation" className="fr-breadcrumb fr-mb-2w" aria-label="vous êtes ici :">
            <ol className="fr-breadcrumb__list">
              <li>
                <Link className="fr-breadcrumb__link" href="/administration">
                  Tableau de bord
                </Link>
              </li>
              <li>
                <Link className="fr-breadcrumb__link" href="/administration/synchronisations">
                  Synchronisations
                </Link>
              </li>
              <li>
                <span className="fr-breadcrumb__link" aria-current="page">
                  Détail du run
                </span>
              </li>
            </ol>
          </nav>

          <div className="fr-grid-row fr-grid-row--middle fr-mb-6w">
            <div className="fr-col">
              <h1 className="fr-h2 fr-mb-1v">Synchronisation du {formatDate(run.startedAt)}</h1>
              <p style={{ color: "var(--text-mention-grey)", marginBottom: 0 }}>
                {status ? (
                  <span className={`fr-badge fr-badge--sm ${STATUS_BADGE_CLASSES[status]} fr-mr-2v`}>
                    {STATUS_LABELS_RUN[status]}
                  </span>
                ) : (
                  <span className="fr-badge fr-badge--sm fr-badge--info fr-mr-2v">En cours</span>
                )}
                Trigger : {TRIGGER_LABELS[run.triggeredBy as SyncRunTrigger]} · Scannés :{" "}
                {run.totalParcoursScanned} · Mis à jour : {run.totalParcoursUpdated} · Erreurs : {run.totalErrors}
              </p>
            </div>
          </div>

          {run.errorSummary && (
            <details className="fr-mb-4w">
              <summary>Résumé des erreurs</summary>
              <pre style={{ whiteSpace: "pre-wrap", fontSize: "0.85rem" }}>{run.errorSummary}</pre>
            </details>
          )}
        </div>
      </section>

      <section className="fr-container-fluid fr-py-4w bg-(--background-alt-blue-france)">
        <div className="fr-container">
          {entries.length === 0 ? (
            <div className="fr-callout">
              <p className="fr-callout__text">
                Aucun parcours n&apos;a été modifié pendant ce run (aucun changement DS, aucune progression, aucune
                erreur).
              </p>
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
                          <th>Étape</th>
                          <th>Statut interne</th>
                          <th>Changements DS</th>
                          <th>Étape avancée</th>
                          <th>Erreur</th>
                          <th>Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {entries.map((entry) => (
                          <tr key={entry.id}>
                            <td>
                              <div>{[entry.userPrenom, entry.userNom].filter(Boolean).join(" ") || "-"}</div>
                              <div className="fr-text--sm" style={{ color: "var(--text-mention-grey)" }}>
                                {entry.userEmail || ""}
                              </div>
                              <Link
                                className="fr-link fr-text--sm"
                                href={`/espace-agent/dossiers/${entry.parcoursId}`}>
                                Voir le parcours
                              </Link>
                            </td>
                            <td>{renderStepTransition(entry.stepBefore, entry.stepAfter)}</td>
                            <td>{renderStatusTransition(entry.statusBefore, entry.statusAfter)}</td>
                            <td style={{ whiteSpace: "pre-line" }}>{renderDsChanges(entry.dsStatusChanges)}</td>
                            <td>{entry.stepAdvanced ? "Oui" : "Non"}</td>
                            <td>
                              {entry.error ? (
                                <span style={{ color: "var(--text-default-error)" }}>{entry.error}</span>
                              ) : (
                                "-"
                              )}
                            </td>
                            <td className="fr-text--sm">{formatDate(entry.createdAt)}</td>
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
