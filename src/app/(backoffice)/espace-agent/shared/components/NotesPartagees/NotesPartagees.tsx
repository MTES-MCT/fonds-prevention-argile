"use client";

import { useState, useEffect, useCallback } from "react";
import { getCommentairesAction } from "@/features/backoffice/espace-agent/shared/actions/commentaires.actions";
import type { CommentaireDetail } from "@/features/backoffice/espace-agent/shared/domain/types/commentaire.types";
import { NoteItem } from "./NoteItem";
import { NoteForm } from "./NoteForm";
import "./NotesPartagees.css";

interface NotesPartageesProps {
  parcoursId: string;
}

/**
 * Composant principal des notes partagées
 * Affiche les commentaires internes sur un parcours avec possibilité d'en ajouter
 */
export function NotesPartagees({ parcoursId }: NotesPartageesProps) {
  const [commentaires, setCommentaires] = useState<CommentaireDetail[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [totalCount, setTotalCount] = useState(0);

  // Charger les commentaires
  const loadCommentaires = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await getCommentairesAction(parcoursId);
      // Trier du plus récent au plus ancien
      const sortedCommentaires = [...result.commentaires].reverse();
      setCommentaires(sortedCommentaires);
      setTotalCount(result.totalCount);
    } catch (error) {
      console.error("Erreur lors du chargement des commentaires:", error);
    } finally {
      setIsLoading(false);
    }
  }, [parcoursId]);

  useEffect(() => {
    loadCommentaires();
  }, [loadCommentaires]);

  // Callback après création d'une note
  function handleNoteCreated() {
    setIsAddingNote(false);
    loadCommentaires(); // Recharger la liste
  }

  // Callback après modification d'une note
  function handleNoteUpdated() {
    loadCommentaires(); // Recharger la liste
  }

  // Callback après suppression d'une note
  function handleNoteDeleted() {
    loadCommentaires(); // Recharger la liste
  }

  // Afficher toutes les notes (plus de limitation)
  const displayedCommentaires = commentaires;

  return (
    <div>
      {/* Card supérieure - Sticky */}
      <div
        className="fr-card"
        style={{
          position: "sticky",
          top: 0,
          zIndex: 10,
          borderRadius: "0.25rem 0.25rem 0 0",
          boxShadow: "0 6px 12px 0 rgba(0, 0, 0, 0.12)",
        }}>
        <div className="fr-card__body fr-p-3w">
          <h3 className="fr-mb-1w" style={{ display: "flex", alignItems: "center" }}>
            <span className="fr-icon-draft-line fr-mr-2v" aria-hidden="true"></span>
            Notes partagées
            {totalCount > 0 && (
              <span className="fr-badge fr-badge--sm fr-badge--no-icon fr-badge--yellow-tournesol fr-ml-2v">
                {totalCount}
              </span>
            )}
          </h3>
          <p className="fr-text--sm fr-mb-0 text-gray-600">
            Ce fil est partagé entre les professionnels du dossier (le demandeur n'a pas accès).
          </p>

          <div className="fr-mt-3w">
            {!isAddingNote && (
              <button
                className="fr-btn fr-btn--secondary fr-btn--sm fr-btn--icon-left fr-icon-add-line"
                onClick={() => setIsAddingNote(true)}
                type="button">
                Ajouter une note
              </button>
            )}

            {isAddingNote && (
              <NoteForm
                parcoursId={parcoursId}
                onSuccess={handleNoteCreated}
                onCancel={() => setIsAddingNote(false)}
              />
            )}
          </div>
        </div>
      </div>

      {/* Card inférieure - Liste des notes */}
      <div className="fr-card" style={{ borderRadius: "0 0 0.25rem 0.25rem", borderTop: "none" }}>
        <div className="fr-card__body">
          <div className="fr-card__content">
            <div
              style={{ maxHeight: "550px", overflowY: "auto" }}
              className="notes-scroll-container">
              {isLoading ? (
                <div className="fr-p-4w text-center">
                  <p className="fr-text--sm text-gray-600">Chargement des notes...</p>
                </div>
              ) : totalCount === 0 ? (
                <div className="fr-p-4w text-center">
                  <p className="fr-text--sm text-gray-600">Aucune note pour le moment.</p>
                </div>
              ) : (
                <div className="fr-mb-2w">
                  {displayedCommentaires.map((commentaire) => (
                    <NoteItem
                      key={commentaire.id}
                      commentaire={commentaire}
                      onUpdated={handleNoteUpdated}
                      onDeleted={handleNoteDeleted}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
