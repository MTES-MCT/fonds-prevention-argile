"use client";

import { SourceAutreCard } from "./SourceAutreCard";

export interface SourceAutreEntry {
  id: string;
  demandeur: string;
  departement: string | null;
  sourcePrecision: string;
}

interface SourcesAutreDrawerProps {
  drawerId: string;
  entries: SourceAutreEntry[];
}

/**
 * Panneau latéral (drawer) affichant le détail individuel des demandeurs ayant
 * indiqué la source d'acquisition "Autre" (déjà scopés période/département par le parent).
 *
 * Purement client : les données sont déjà en mémoire (`filteredUsers`), pas d'appel serveur.
 */
export function SourcesAutreDrawer({ drawerId, entries }: SourcesAutreDrawerProps) {
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
                  Détail de la source &laquo; Autre &raquo;
                </h1>

                <p className="fr-text--sm fr-mb-3w" style={{ color: "var(--text-mention-grey)" }}>
                  <strong>
                    {entries.length} résultat{entries.length > 1 ? "s" : ""}
                  </strong>
                </p>

                {entries.length === 0 && (
                  <p className="fr-text--sm" style={{ color: "var(--text-mention-grey)" }}>
                    Aucun demandeur avec la source &laquo; Autre &raquo; sur cette période.
                  </p>
                )}

                {entries.map((entry) => (
                  <SourceAutreCard
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
