"use client";

import { useState } from "react";
import { deleteCommentaireAction } from "@/features/backoffice/espace-agent/shared/actions/commentaires.actions";
import type { CommentaireDetail } from "@/features/backoffice/espace-agent/shared/domain/types/commentaire.types";
import { formatRelativeTimeShort } from "@/shared/utils/date.utils";
import { NoteForm } from "./NoteForm";
import { ActionMenu } from "../ActionMenu";

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
  const [isDeleting, setIsDeleting] = useState(false);

  // Nom complet de l'auteur
  const authorName = commentaire.agent.usualName
    ? `${commentaire.agent.givenName} ${commentaire.agent.usualName}`
    : commentaire.agent.givenName;

  // Structure type label
  const structureLabel = commentaire.agent.structureName || commentaire.agent.structureType;

  // Temps relatif
  const relativeTime = formatRelativeTimeShort(commentaire.createdAt);

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
        <p
          className="fr-text--sm fr-mb-0"
          style={{ whiteSpace: "pre-wrap", paddingRight: isOwnComment ? "1.15rem" : undefined }}>
          {commentaire.message}
        </p>

        {/* Menu d'actions (uniquement visible pour l'auteur) */}
        {isOwnComment && (
          <div style={{ position: "absolute", top: "0.5rem", right: "0.5rem", zIndex: 1 }}>
            <ActionMenu
              items={[
                { label: "Modifier", onClick: () => setIsEditing(true) },
                { label: "Supprimer", onClick: handleDelete, variant: "danger", disabled: isDeleting },
              ]}
            />
          </div>
        )}
      </div>
    </div>
  );
}
