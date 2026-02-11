"use client";

import { useState, useRef, useEffect } from "react";
import { deleteCommentaireAction } from "@/features/backoffice/espace-agent/shared/actions/commentaires.actions";
import type { CommentaireDetail } from "@/features/backoffice/espace-agent/shared/domain/types/commentaire.types";
import { formatRelativeTimeShort } from "@/shared/utils/date.utils";
import { NoteForm } from "./NoteForm";

interface NoteItemProps {
  commentaire: CommentaireDetail;
  currentAgentId?: string;
  onUpdated: () => void;
  onDeleted: () => void;
}

/**
 * Composant affichant une note individuelle
 * Avec menu d'actions (modifier/supprimer) si l'utilisateur est l'auteur
 */
export function NoteItem({ commentaire, currentAgentId, onUpdated, onDeleted }: NoteItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Fermer le menu si clic à l'extérieur
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    }

    if (isMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isMenuOpen]);

  // Nom complet de l'auteur
  const authorName = commentaire.agent.usualName
    ? `${commentaire.agent.givenName} ${commentaire.agent.usualName}`
    : commentaire.agent.givenName;

  // Structure type label
  const structureLabel = commentaire.agent.structureName || commentaire.agent.structureType;

  // Temps relatif
  const relativeTime = formatRelativeTimeShort(commentaire.createdAt);

  // Indicateur de modification
  const isEdited = commentaire.editedAt !== null;

  // L'utilisateur courant est-il l'auteur de ce commentaire ?
  const isOwnComment = currentAgentId === commentaire.agent.id;

  // Supprimer la note
  async function handleDelete() {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cette note ?")) {
      return;
    }

    setIsDeleting(true);
    try {
      const result = await deleteCommentaireAction(commentaire.id);
      if (result.success) {
        onDeleted();
      } else {
        alert(result.error || "Erreur lors de la suppression de la note.");
      }
    } catch (error) {
      console.error("Erreur lors de la suppression:", error);
      alert("Une erreur est survenue.");
    } finally {
      setIsDeleting(false);
      setIsMenuOpen(false);
    }
  }

  // Callback après modification
  function handleUpdateSuccess() {
    setIsEditing(false);
    onUpdated();
  }

  // Mode édition
  if (isEditing) {
    return (
      <div className="fr-mb-3w">
        <NoteForm
          parcoursId={commentaire.parcoursId}
          commentaireId={commentaire.id}
          initialMessage={commentaire.message}
          onSuccess={handleUpdateSuccess}
          onCancel={() => setIsEditing(false)}
        />
      </div>
    );
  }

  // Mode affichage
  return (
    <div className="fr-mb-3w">
      {/* En-tête de la note */}
      <div className="fr-grid-row fr-grid-row--middle">
        <div className="fr-col">
          <strong className="fr-text--sm fr-mr-1v">{authorName}</strong>
          <span className="fr-text--xs fr-text-mention--grey" style={{ fontStyle: "italic" }}>
            {structureLabel}
          </span>
        </div>

        <div className="fr-col-auto">
          <span className="fr-text--xs fr-text-mention--grey">{relativeTime}</span>
        </div>
      </div>

      {/* Contenu de la note - Card avec fond gris */}
      <div className="fr-p-2w" style={{ backgroundColor: "#f6f6f6", borderRadius: "0.25rem", position: "relative" }}>
        <p className="fr-text--sm fr-mb-0" style={{ whiteSpace: "pre-wrap", paddingRight: isOwnComment ? "1.15rem" : undefined }}>
          {commentaire.message}
        </p>

        {/* Menu d'actions (uniquement visible pour l'auteur) - Dans la carte */}
        {isOwnComment && (
          <div style={{ position: "absolute", top: "0.5rem", right: "0.5rem", zIndex: 1 }} ref={menuRef}>
            <button
              className="fr-btn fr-btn--tertiary-no-outline fr-btn--sm fr-icon-more-line"
              aria-label="Actions"
              title="Actions"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              type="button"
              style={{ padding: "0.25rem" }}
            />

            {isMenuOpen && (
              <div
                style={{
                  position: "absolute",
                  right: 0,
                  top: "100%",
                  marginTop: "0.125rem",
                  zIndex: 1000,
                  backgroundColor: "white",
                  border: "1px solid var(--border-default-grey)",
                  borderRadius: "4px",
                  boxShadow: "0 2px 6px rgba(0,0,0,0.12)",
                  overflow: "hidden",
                }}>
                <button
                  onClick={() => {
                    setIsEditing(true);
                    setIsMenuOpen(false);
                  }}
                  type="button"
                  className="fr-text--sm fr-mb-0"
                  style={{
                    width: "100%",
                    textAlign: "left",
                    padding: "0.375rem 0.75rem",
                    border: "none",
                    backgroundColor: "transparent",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.375rem",
                    color: "var(--text-action-high-blue-france)",
                    whiteSpace: "nowrap",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#f6f6f6")}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}>
                  <span className="fr-icon-edit-fill fr-icon--sm" aria-hidden="true"></span>
                  Modifier
                </button>
                <div style={{ borderTop: "1px solid var(--border-default-grey)" }} />
                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  type="button"
                  className="fr-text--sm fr-mb-0"
                  style={{
                    width: "100%",
                    textAlign: "left",
                    padding: "0.375rem 0.75rem",
                    border: "none",
                    backgroundColor: "transparent",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.375rem",
                    color: "#ce0500",
                    whiteSpace: "nowrap",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#f6f6f6")}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}>
                  <span className="fr-icon-delete-fill fr-icon--sm" aria-hidden="true"></span>
                  {isDeleting ? "Suppression..." : "Supprimer"}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
