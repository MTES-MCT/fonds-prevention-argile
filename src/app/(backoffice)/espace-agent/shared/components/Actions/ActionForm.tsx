"use client";

import { useState, useRef, useEffect } from "react";
import {
  createActionAction,
  updateActionAction,
} from "@/features/backoffice/espace-agent/shared/actions/dossier-actions.actions";
import {
  ACTION_TYPE_GROUPS,
  ACTION_TYPE_AUTRE,
  ACTION_TYPE_COMMENTAIRE_LIBRE,
} from "@/features/backoffice/espace-agent/shared/domain/types/action.types";

interface ActionFormProps {
  parcoursId: string;
  /** Si présent, mode édition du commentaire d'une action existante */
  actionId?: string;
  /** Message initial (mode édition) */
  initialMessage?: string;
  onSuccess: () => void;
  onCancel: () => void;
}

const MAX_LENGTH = 5000;

/**
 * Formulaire d'ajout d'une action (type d'action + commentaire optionnel),
 * ou d'édition du commentaire d'une action existante.
 */
export function ActionForm({ parcoursId, actionId, initialMessage = "", onSuccess, onCancel }: ActionFormProps) {
  const isEditMode = !!actionId;

  const [actionType, setActionType] = useState<string>("");
  const [precision, setPrecision] = useState("");
  const [message, setMessage] = useState(initialMessage);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const selectRef = useRef<HTMLSelectElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const remainingChars = MAX_LENGTH - message.length;

  useEffect(() => {
    if (isEditMode) {
      textareaRef.current?.focus();
    } else {
      selectRef.current?.focus();
    }
  }, [isEditMode]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (message.length > MAX_LENGTH) {
      setError(`Le commentaire ne peut pas dépasser ${MAX_LENGTH} caractères.`);
      return;
    }

    if (!isEditMode) {
      if (!actionType) {
        setError("Veuillez sélectionner une action.");
        return;
      }
      if (actionType === ACTION_TYPE_COMMENTAIRE_LIBRE && !message.trim()) {
        setError("Le commentaire ne peut pas être vide.");
        return;
      }
      if (actionType === ACTION_TYPE_AUTRE && !precision.trim()) {
        setError("Veuillez préciser l'action réalisée.");
        return;
      }
    } else if (!message.trim()) {
      setError("Le commentaire ne peut pas être vide.");
      return;
    }

    setIsSubmitting(true);

    try {
      const result = isEditMode
        ? await updateActionAction(actionId, message)
        : await createActionAction(parcoursId, {
            actionType,
            message: message.trim() || undefined,
            actionPrecision: precision.trim() || undefined,
          });

      if (result.success) {
        onSuccess();
      } else {
        setError(result.error || "Une erreur est survenue.");
      }
    } catch (err) {
      console.error("Erreur lors de la soumission:", err);
      setError("Une erreur est survenue.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* 1. Type d'action (création uniquement) */}
      {!isEditMode && (
        <>
          <div className="fr-select-group">
            <label className="fr-label fr-text--bold" htmlFor="action-type-select">
              1. Quelle action voulez-vous ajouter ?
              <span className="fr-hint-text">Cette information permet de qualifier le dossier</span>
            </label>
            <select
              ref={selectRef}
              className="fr-select"
              id="action-type-select"
              value={actionType}
              onChange={(e) => setActionType(e.target.value)}
              disabled={isSubmitting}>
              <option value="" disabled>
                Sélectionner une option
              </option>
              {ACTION_TYPE_GROUPS.map((group) =>
                group.groupe === null ? (
                  group.items.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))
                ) : (
                  <optgroup key={group.groupe} label={group.groupe}>
                    {group.items.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </optgroup>
                )
              )}
            </select>
          </div>

          {/* Précision si "Autre" */}
          {actionType === ACTION_TYPE_AUTRE && (
            <div className="fr-input-group">
              <label className="fr-label" htmlFor="action-precision">
                Précisez l&apos;action réalisée
              </label>
              <input
                className="fr-input"
                type="text"
                id="action-precision"
                value={precision}
                onChange={(e) => setPrecision(e.target.value)}
                disabled={isSubmitting}
                placeholder="Précisez l'action réalisée"
              />
            </div>
          )}
        </>
      )}

      {/* 2. Note complémentaire */}
      <div className="fr-input-group fr-mt-2w">
        <label className="fr-label fr-text--bold" htmlFor="action-message">
          {isEditMode ? "Note complémentaire" : "2. Note complémentaire"}
          <span className="fr-hint-text">
            Optionnelle. Le demandeur n&apos;aura pas accès à cette note.
          </span>
        </label>
        <textarea
          ref={textareaRef}
          className="fr-input"
          id="action-message"
          rows={3}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Ajoutez un commentaire si nécessaire"
          maxLength={MAX_LENGTH}
          disabled={isSubmitting}
        />
        <div className="fr-text--xs fr-mt-1v" style={{ color: "#666" }}>
          {remainingChars} caractères restants
        </div>
      </div>

      {/* Message d'erreur */}
      {error && (
        <div className="fr-alert fr-alert--error fr-alert--sm fr-mb-2w">
          <p className="fr-alert__title">{error}</p>
        </div>
      )}

      {/* Boutons d'action */}
      <ul className="fr-btns-group fr-btns-group--inline fr-btns-group--sm fr-mt-2w">
        <li>
          <button type="button" className="fr-btn fr-btn--secondary" onClick={onCancel} disabled={isSubmitting}>
            Annuler
          </button>
        </li>
        <li>
          <button
            type="submit"
            className="fr-btn fr-btn--icon-left fr-icon-save-line"
            disabled={isSubmitting}>
            {isSubmitting ? "Enregistrement..." : isEditMode ? "Modifier" : "Enregistrer"}
          </button>
        </li>
      </ul>
    </form>
  );
}
