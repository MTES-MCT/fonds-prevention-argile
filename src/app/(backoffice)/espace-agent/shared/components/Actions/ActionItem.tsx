"use client";

import { useState } from "react";
import { deleteActionAction } from "@/features/backoffice/espace-agent/shared/actions/dossier-actions.actions";
import {
  ACTION_LABELS_BY_VALUE,
  ACTION_TYPE_AUTRE,
  type ActionDetail,
} from "@/features/backoffice/espace-agent/shared/domain/types/action.types";
import { formatRelativeTimeShort } from "@/shared/utils/date.utils";
import { ActionForm } from "./ActionForm";
import { ActionMenu } from "../ActionMenu";

interface ActionItemProps {
  action: ActionDetail;
  currentAgentId?: string;
  onUpdated: () => void;
  onDeleted: () => void;
}

/** Nombre de colonnes du tableau (pour le colSpan de la ligne d'édition) */
const COLUMN_COUNT = 4;

/**
 * Ligne de tableau affichant une action réalisée.
 * Menu Modifier / Supprimer réservé à l'auteur.
 */
export function ActionItem({ action, currentAgentId, onUpdated, onDeleted }: ActionItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const authorName = action.agent.usualName
    ? `${action.agent.givenName} ${action.agent.usualName}`
    : action.agent.givenName;
  const structureLabel = action.agent.structureName || action.agent.structureType;
  const relativeTime = formatRelativeTimeShort(action.createdAt);

  // Libellé de l'action (avec précision si "Autre")
  let actionLabel = ACTION_LABELS_BY_VALUE[action.actionType] ?? action.actionType;
  if (action.actionType === ACTION_TYPE_AUTRE && action.actionPrecision) {
    actionLabel = `${actionLabel} : ${action.actionPrecision}`;
  }

  const isOwnAction = currentAgentId === action.agent.id;

  async function handleDelete() {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cette action ?")) {
      return;
    }

    setIsDeleting(true);
    try {
      const result = await deleteActionAction(action.id);
      if (result.success) {
        onDeleted();
      } else {
        alert(result.error || "Erreur lors de la suppression de l'action.");
      }
    } catch (error) {
      console.error("Erreur lors de la suppression:", error);
      alert("Une erreur est survenue.");
    } finally {
      setIsDeleting(false);
    }
  }

  function handleUpdateSuccess() {
    setIsEditing(false);
    onUpdated();
  }

  // Mode édition : ligne pleine largeur avec le formulaire
  if (isEditing) {
    return (
      <tr>
        <td colSpan={COLUMN_COUNT}>
          <ActionForm
            parcoursId={action.parcoursId}
            actionId={action.id}
            initialMessage={action.message ?? ""}
            onSuccess={handleUpdateSuccess}
            onCancel={() => setIsEditing(false)}
          />
        </td>
      </tr>
    );
  }

  return (
    <tr>
      <td>{actionLabel}</td>
      <td>
        <span className="fr-text--sm">{authorName}</span>
        <br />
        <span className="fr-text--xs fr-text-mention--grey" style={{ fontStyle: "italic" }}>
          {structureLabel}
        </span>
      </td>
      <td>
        <span className="fr-text--xs fr-text-mention--grey">{relativeTime}</span>
      </td>
      <td>
        <div style={{ display: "flex", alignItems: "flex-start", gap: "0.5rem", justifyContent: "space-between" }}>
          <span className="fr-text--sm" style={{ whiteSpace: "pre-wrap" }}>
            {action.message || "—"}
          </span>
          {isOwnAction && (
            <ActionMenu
              items={[
                { label: "Modifier", onClick: () => setIsEditing(true) },
                { label: "Supprimer", onClick: handleDelete, variant: "danger", disabled: isDeleting },
              ]}
            />
          )}
        </div>
      </td>
    </tr>
  );
}
