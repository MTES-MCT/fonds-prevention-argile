"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import Link from "next/link";
import {
  getParcoursDiagnosticDetailAction,
  searchEligibiliteByEmailAction,
} from "@/features/backoffice/administration/diagnostics/actions/diagnostics.actions";
import type {
  ParcoursDiagnosticDetail,
  DsEmailHit,
} from "@/features/backoffice/administration/diagnostics/services/diagnostics-detail.service";
import { STEP_LABELS } from "@/shared/domain/value-objects/step.enum";
import { getDossierDsDemandeUrl } from "@/features/parcours/dossiers-ds/utils";
import { AdminBreadcrumb } from "../../../shared/components/AdminBreadcrumb";

function userLabel(d: ParcoursDiagnosticDetail): string {
  const name = [d.user.prenom, d.user.nom].filter(Boolean).join(" ").trim();
  return name || d.user.email || d.parcoursId.slice(0, 8);
}

export default function ParcoursDiagnosticPanel({ parcoursId }: { parcoursId: string }) {
  const [detail, setDetail] = useState<ParcoursDiagnosticDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [hits, setHits] = useState<DsEmailHit[] | null>(null);
  const [capped, setCapped] = useState(false);
  const [isSearching, startSearch] = useTransition();

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const res = await getParcoursDiagnosticDetailAction(parcoursId);
    if (res.success) setDetail(res.data);
    else setError(res.error || "Erreur lors du chargement");
    setIsLoading(false);
  }, [parcoursId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSearch = () => {
    setHits(null);
    startSearch(async () => {
      const res = await searchEligibiliteByEmailAction(parcoursId);
      if (res.success) {
        setHits(res.data.hits);
        setCapped(res.data.capped);
      } else {
        setError(res.error || "Erreur lors de la recherche");
      }
    });
  };

  return (
    <>
      <section className="fr-container-fluid fr-pt-4w" style={{ borderBottom: "1px solid var(--border-default-grey)" }}>
        <div className="fr-container">
          <AdminBreadcrumb currentPageLabel="Diagnostics DN — analyse parcours" />
          <p className="fr-mb-2v">
            <Link href="/administration/diagnostics" className="fr-link fr-icon-arrow-left-line fr-link--icon-left">
              Retour aux diagnostics DN
            </Link>
          </p>
          <h1 className="fr-h2 fr-mb-1v">Analyse d&apos;un parcours</h1>
          {detail && (
            <p style={{ color: "var(--text-mention-grey)", marginBottom: 0 }}>
              {userLabel(detail)} — {STEP_LABELS[detail.currentStep]} / {detail.currentStatus}
              {detail.archivedAt ? " · archivé" : ""}
              {detail.completedAt ? " · complété" : ""}
            </p>
          )}
          {error && (
            <div className="fr-alert fr-alert--error fr-my-4w">
              <p>{error}</p>
            </div>
          )}
        </div>
      </section>

      <section className="fr-container-fluid fr-py-4w bg-(--background-alt-blue-france)">
        <div className="fr-container">
          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <div className="text-gray-500">Cross-check DS en cours...</div>
            </div>
          ) : !detail ? (
            <div className="fr-callout">
              <p className="fr-callout__text">Parcours introuvable.</p>
            </div>
          ) : (
            <>
              <h2 className="fr-h6 fr-mb-2v">Dossiers du parcours (état local vs Démarches Simplifiées)</h2>
              <div className="fr-table fr-table--bordered fr-mb-4w">
                <div className="fr-table__wrapper">
                  <div className="fr-table__container">
                    <div className="fr-table__content">
                      <table>
                        <thead>
                          <tr>
                            <th>Étape</th>
                            <th>N° DS</th>
                            <th>Statut local</th>
                            <th>État réel DS</th>
                            <th>Diagnostic métier</th>
                          </tr>
                        </thead>
                        <tbody>
                          {detail.dossiers.length === 0 ? (
                            <tr>
                              <td colSpan={5}>Aucun dossier DS rattaché à ce parcours.</td>
                            </tr>
                          ) : (
                            detail.dossiers.map((d) => (
                              <tr key={d.step}>
                                <td>{STEP_LABELS[d.step]}</td>
                                <td>{d.dsNumber ? `#${d.dsNumber}` : "-"}</td>
                                <td>{d.localStatus ?? "non déposé"}</td>
                                <td>{d.dsError ? <em>erreur : {d.dsError}</em> : (d.dsState ?? "-")}</td>
                                <td style={{ maxWidth: 420 }}>
                                  {d.explanation ? (
                                    <>
                                      <span
                                        className={`fr-badge fr-badge--sm ${d.explanation.isBug ? "fr-badge--error" : "fr-badge--success"} fr-mb-1v`}>
                                        {d.explanation.label}
                                      </span>
                                      <p className="fr-text--xs fr-mb-0" style={{ color: "var(--text-mention-grey)" }}>
                                        {d.explanation.explanation}
                                      </p>
                                    </>
                                  ) : (
                                    "-"
                                  )}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>

              <h2 className="fr-h6 fr-mb-2v">Recherche du dossier perdu côté DS</h2>
              <p className="fr-text--sm" style={{ color: "var(--text-mention-grey)" }}>
                Recherche les dossiers de la démarche éligibilité dont l&apos;email usager correspond au demandeur
                (utile pour un parcours « dossier perdu »). Opération coûteuse (balaye la démarche).
              </p>
              <button
                type="button"
                className="fr-btn fr-btn--secondary fr-mb-2w"
                onClick={handleSearch}
                disabled={isSearching}>
                {isSearching ? "Recherche en cours..." : "Rechercher côté DS par email"}
              </button>

              {hits && (
                <div className="fr-mt-2w">
                  {capped && (
                    <div className="fr-alert fr-alert--warning fr-alert--sm fr-mb-2w">
                      <p>Recherche tronquée (limite de pages atteinte). Résultats potentiellement incomplets.</p>
                    </div>
                  )}
                  {hits.length === 0 ? (
                    <p className="fr-text--sm">Aucun dossier éligibilité trouvé pour les emails du demandeur.</p>
                  ) : (
                    <ul className="fr-text--sm">
                      {hits.map((h) => (
                        <li key={h.dossierNumber}>
                          <Link
                            href={getDossierDsDemandeUrl(h.dossierNumber)}
                            target="_blank"
                            rel="noopener noreferrer">
                            Dossier #{h.dossierNumber}
                          </Link>{" "}
                          — état {h.state}
                          {h.archived ? " (archivé)" : ""} — match : {h.matchedEmail}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </>
  );
}
