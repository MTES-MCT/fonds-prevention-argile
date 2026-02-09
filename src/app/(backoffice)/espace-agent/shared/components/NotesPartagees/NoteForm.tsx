"use client";

import { useState, useRef, useEffect } from "react";
import {
  createCommentaireAction,
  updateCommentaireAction,
} from "@/features/backoffice/espace-agent/shared/actions/commentaires.actions";

interface NoteFormProps {
  parcoursId: string;
  commentaireId?: string; // Si présent, mode édition
  initialMessage?: string; // Message initial en mode édition
  onSuccess: () => void;
  onCancel: () => void;
}

const MAX_LENGTH = 5000;

/**
 * Formulaire pour ajouter ou éditer une note
 */
export function NoteForm({ parcoursId, commentaireId, initialMessage = "", onSuccess, onCancel }: NoteFormProps) {
  const [message, setMessage] = useState(initialMessage);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isEditMode = !!commentaireId;
  const remainingChars = MAX_LENGTH - message.length;

  // Focus automatique sur le textarea
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  // Soumettre le formulaire
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    // Validation
    if (!message.trim()) {
      setError("Le message ne peut pas être vide.");
      return;
    }

    if (message.length > MAX_LENGTH) {
      setError(`Le message ne peut pas dépasser ${MAX_LENGTH} caractères.`);
      return;
    }

    setIsSubmitting(true);

    try {
      const result = isEditMode
        ? await updateCommentaireAction(commentaireId, message)
        : await createCommentaireAction(parcoursId, message);

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
      {/* Textarea */}
      <div className="fr-input-group">
        <textarea
          ref={textareaRef}
          className="fr-input"
          rows={4}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Saisir votre note..."
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
          <button type="submit" className="fr-btn" disabled={isSubmitting || !message.trim()}>
            {isSubmitting ? "Enregistrement..." : isEditMode ? "Modifier" : "Ajouter"}
          </button>
        </li>
      </ul>
    </form>
  );
}
