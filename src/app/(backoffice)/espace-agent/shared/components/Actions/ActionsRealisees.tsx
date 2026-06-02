"use client";

import { useState, useEffect, useCallback } from "react";
import { getActionsAction } from "@/features/backoffice/espace-agent/shared/actions/dossier-actions.actions";
import type { ActionDetail } from "@/features/backoffice/espace-agent/shared/domain/types/action.types";
import { ActionItem } from "./ActionItem";
import { ActionForm } from "./ActionForm";

interface ActionsRealiseesProps {
  parcoursId: string;
}

/** Nombre d'actions affichées avant le bouton "Voir plus" */
const DEFAULT_VISIBLE = 6;

/**
 * Bloc "Actions réalisées" : liste les actions d'un parcours (6 dernières par défaut)
 * et permet d'en ajouter une nouvelle.
 */
export function ActionsRealisees({ parcoursId }: ActionsRealiseesProps) {
  const [actions, setActions] = useState<ActionDetail[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddingAction, setIsAddingAction] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [currentAgentId, setCurrentAgentId] = useState<string | undefined>();

  const loadActions = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await getActionsAction(parcoursId);
      // Trier du plus récent au plus ancien
      const sorted = [...result.actions].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      setActions(sorted);
      setTotalCount(result.totalCount);
      setCurrentAgentId(result.currentAgentId);
    } catch (error) {
      console.error("Erreur lors du chargement des actions:", error);
    } finally {
      setIsLoading(false);
    }
  }, [parcoursId]);

  useEffect(() => {
    loadActions();
  }, [loadActions]);

  function handleActionCreated() {
    setIsAddingAction(false);
    loadActions();
  }

  const displayedActions = showAll ? actions : actions.slice(0, DEFAULT_VISIBLE);
  const hasMore = totalCount > DEFAULT_VISIBLE;

  return (
    <div className="fr-card">
      <div className="fr-card__body fr-p-3w">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem" }}>
          <div>
            <h3 className="fr-mb-1w" style={{ display: "flex", alignItems: "center" }}>
              <span className="fr-icon-calendar-line fr-mr-2v" aria-hidden="true"></span>
              Actions réalisées
              {totalCount > 0 && (
                <span className="fr-badge fr-badge--sm fr-badge--no-icon fr-badge--yellow-tournesol fr-ml-2v">
                  {totalCount}
                </span>
              )}
            </h3>
            <p className="fr-text--sm fr-mb-0 text-gray-600">
              Tout élément pertinent qui ne rentre pas dans la qualification du dossier.
            </p>
          </div>
          {!isAddingAction && (
            <button
              className="fr-btn fr-btn--secondary fr-btn--sm fr-btn--icon-left fr-icon-add-line"
              onClick={() => setIsAddingAction(true)}
              type="button"
              style={{ whiteSpace: "nowrap", flexShrink: 0 }}>
              Ajouter une action
            </button>
          )}
        </div>

        {isAddingAction && (
          <div className="fr-mt-3w">
            <ActionForm parcoursId={parcoursId} onSuccess={handleActionCreated} onCancel={() => setIsAddingAction(false)} />
          </div>
        )}

        <hr className="fr-hr fr-mt-3w" style={{ marginBottom: 0 }} />

        <div className="fr-pt-2w">
          {isLoading ? (
            <div className="fr-p-4w text-center">
              <p className="fr-text--sm text-gray-600">Chargement des actions...</p>
            </div>
          ) : totalCount === 0 ? (
            <div className="fr-p-4w text-center">
              <p className="fr-text--sm text-gray-600">Aucune action pour le moment.</p>
            </div>
          ) : (
            <>
              <div className="fr-table fr-table--sm fr-table--bordered fr-mb-0">
                <div className="fr-table__wrapper">
                  <div className="fr-table__container">
                    <div className="fr-table__content">
                      <table style={{ width: "100%" }}>
                        <thead>
                          <tr>
                            <th scope="col">Action réalisée</th>
                            <th scope="col">Par</th>
                            <th scope="col">Date</th>
                            <th scope="col">Note complémentaire</th>
                          </tr>
                        </thead>
                        <tbody>
                          {displayedActions.map((action) => (
                            <ActionItem
                              key={action.id}
                              action={action}
                              currentAgentId={currentAgentId}
                              onUpdated={loadActions}
                              onDeleted={loadActions}
                            />
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>

              {hasMore && (
                <div className="fr-mt-2w text-center">
                  <button
                    type="button"
                    className="fr-btn fr-btn--tertiary-no-outline fr-btn--sm"
                    onClick={() => setShowAll((v) => !v)}>
                    {showAll ? "Voir moins" : "Voir plus"}
                    <span
                      className={`${showAll ? "fr-icon-arrow-up-s-line" : "fr-icon-arrow-down-s-line"} fr-icon--sm fr-ml-1v`}
                      aria-hidden="true"></span>
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
