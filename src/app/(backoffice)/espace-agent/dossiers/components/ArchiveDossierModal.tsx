"use client";

import { useEffect, useRef, useState, useId } from "react";
import { archiveDossierAction } from "@/features/backoffice/espace-agent/dossiers/actions";

const ARCHIVE_REASONS = [
  "Le demandeur n'est pas éligible",
  "Reste à charge trop élevé",
  "Le demandeur a abandonné le projet",
  "Le demandeur ne donne pas de réponse",
  "Fausse déclaration / documents falsifiés",
  "Autre",
] as const;

interface ArchiveDossierModalProps {
  isOpen: boolean;
  onClose: () => void;
  parcoursId: string;
  onSuccess: () => void;
}

/**
 * Modale d'archivage d'un dossier AMO
 * Permet de sélectionner une raison avant d'archiver
 */
export function ArchiveDossierModal({ isOpen, onClose, parcoursId, onSuccess }: ArchiveDossierModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const uniqueId = useId();
  const modalId = `modal-archive-dossier-${uniqueId}`;
  const selectId = `archive-reason-${uniqueId}`;

  // Ouvrir/fermer via l'API DSFR
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const modalInstance = (window as any).dsfr?.(dialog)?.modal;
    if (!modalInstance) return;

    if (isOpen) {
      modalInstance.disclose();
    } else {
      modalInstance.conceal();
    }
  }, [isOpen]);

  // Ecouter la fermeture externe (Escape, clic en dehors)
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleConceal = () => {
      setReason("");
      setError(null);
      onClose();
    };

    dialog.addEventListener("dsfr.conceal", handleConceal);
    return () => {
      dialog.removeEventListener("dsfr.conceal", handleConceal);
    };
  }, [onClose]);

  async function handleSubmit() {
    if (!reason) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const result = await archiveDossierAction(parcoursId, reason);

      if (result.success) {
        setReason("");
        // Fermer la modale via DSFR
        const dialog = dialogRef.current;
        if (dialog) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const modalInstance = (window as any).dsfr?.(dialog)?.modal;
          if (modalInstance) modalInstance.conceal();
        }
        onSuccess();
      } else {
        setError(result.error || "Erreur lors de l'archivage");
      }
    } catch {
      setError("Une erreur est survenue");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <dialog ref={dialogRef} id={modalId} className="fr-modal" aria-labelledby={`${modalId}-title`}>
      <div className="fr-container fr-container--fluid fr-container-md">
        <div className="fr-grid-row fr-grid-row--center">
          <div className="fr-col-12 fr-col-md-10 fr-col-lg-8">
            <div className="fr-modal__body">
              <div className="fr-modal__header">
                <button aria-controls={modalId} title="Fermer" type="button" className="fr-btn--close fr-btn">
                  Fermer
                </button>
              </div>
              <div className="fr-modal__content">
                <h1 id={`${modalId}-title`} className="fr-modal__title">
                  Archiver le dossier ?
                </h1>
                <p>
                  Le dossier passera en statut &quot;<strong>Archiv&eacute;</strong>&quot;. Vous pourrez toujours le
                  mettre &agrave; jour tant qu&apos;il n&apos;est pas transf&eacute;r&eacute; &agrave; l&apos;AMO ou
                  supprim&eacute; par le demandeur.
                </p>

                {error && (
                  <div className="fr-alert fr-alert--error fr-alert--sm fr-mb-2w">
                    <p>{error}</p>
                  </div>
                )}

                <div className="fr-select-group">
                  <label className="fr-label" htmlFor={selectId}>
                    Pour quelles raisons souhaitez-vous archiver le dossier ?
                  </label>
                  <select
                    className="fr-select"
                    id={selectId}
                    name="archive-reason"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}>
                    <option value="" disabled>
                      S&eacute;lectionnez une raison
                    </option>
                    {ARCHIVE_REASONS.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="fr-modal__footer">
                <ul className="fr-btns-group fr-btns-group--right fr-btns-group--inline-reverse fr-btns-group--inline-lg">
                  <li>
                    <button
                      type="button"
                      className="fr-btn"
                      disabled={!reason || isSubmitting}
                      onClick={handleSubmit}>
                      {isSubmitting ? "Archivage..." : "Archiver"}
                    </button>
                  </li>
                  <li>
                    <button type="button" className="fr-btn fr-btn--secondary" aria-controls={modalId}>
                      Annuler
                    </button>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </dialog>
  );
}
