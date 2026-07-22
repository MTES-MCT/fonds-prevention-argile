"use client";

import { SourceDetailCard } from "./SourceDetailCard";

export interface SourceDetailEntry {
  id: string;
  demandeur: string;
  departement: string | null;
  sourcePrecision: string;
}

interface SourceDetailDrawerProps {
  drawerId: string;
  /** Libellé de la source affiché dans le titre, ex: "Autre", "Assurance" */
  sourceLabel: string;
  entries: SourceDetailEntry[];
}

/**
 * Panneau latéral (drawer) affichant le détail individuel des demandeurs ayant indiqué
 * une source d'acquisition à précision libre (déjà scopés période/département par le parent).
 *
 * Purement client : les données sont déjà en mémoire (`filteredUsers`), pas d'appel serveur.
 */
export function SourceDetailDrawer({ drawerId, sourceLabel, entries }: SourceDetailDrawerProps) {
  return (
    <dialog id={drawerId} className="fr-modal" aria-labelledby={`${drawerId}-title`}>
      {/* Override DSFR max-height pour forcer pleine hauteur */}
      <style>{`
        #${CSS.escape(drawerId)} .fr-modal__body {
          max-height: 100vh !important;
          min-height: 100vh !important;
          height: 100vh !important;
        }
      `}</style>
      <div className="fr-container fr-container--fluid fr-container-md">
        <div className="fr-grid-row fr-grid-row--right">
          <div className="fr-col-12 fr-col-md-6 fr-col-lg-4">
            <div
              className="fr-modal__body"
              style={{
                position: "fixed",
                top: 0,
                right: 0,
                bottom: 0,
                width: "100%",
                maxWidth: "40rem",
                margin: 0,
                borderRadius: 0,
                boxShadow: "-4px 0 24px rgba(0, 0, 0, 0.15)",
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
              }}>
              <div className="fr-modal__header">
                <button aria-controls={drawerId} title="Fermer" type="button" className="fr-btn--close fr-btn">
                  Fermer
                </button>
              </div>
              <div className="fr-modal__content" style={{ flex: 1, overflowY: "auto" }}>
                <h1 id={`${drawerId}-title`} className="fr-modal__title">
                  Détail de la source &laquo; {sourceLabel} &raquo;
                </h1>

                <p className="fr-text--sm fr-mb-3w" style={{ color: "var(--text-mention-grey)" }}>
                  <strong>
                    {entries.length} résultat{entries.length > 1 ? "s" : ""}
                  </strong>
                </p>

                {entries.length === 0 && (
                  <p className="fr-text--sm" style={{ color: "var(--text-mention-grey)" }}>
                    Aucun demandeur avec cette source sur cette période.
                  </p>
                )}

                {entries.map((entry) => (
                  <SourceDetailCard
                    key={entry.id}
                    demandeur={entry.demandeur}
                    departement={entry.departement}
                    sourcePrecision={entry.sourcePrecision}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </dialog>
  );
}
