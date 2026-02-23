"use client";

import { useEffect, useRef, useState, useId } from "react";
import { unarchiveDossierAction } from "@/features/backoffice/espace-agent/dossiers/actions";

interface UnarchiveDossierModalProps {
  isOpen: boolean;
  onClose: () => void;
  parcoursId: string;
  onSuccess: () => void;
}

/**
 * Modale de confirmation de désarchivage d'un dossier AMO
 */
export function UnarchiveDossierModal({ isOpen, onClose, parcoursId, onSuccess }: UnarchiveDossierModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const uniqueId = useId();
  const modalId = `modal-unarchive-dossier-${uniqueId}`;

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
      setError(null);
      onClose();
    };

    dialog.addEventListener("dsfr.conceal", handleConceal);
    return () => {
      dialog.removeEventListener("dsfr.conceal", handleConceal);
    };
  }, [onClose]);

  async function handleSubmit() {
    setIsSubmitting(true);
    setError(null);

    try {
      const result = await unarchiveDossierAction(parcoursId);

      if (result.success) {
        // Fermer la modale via DSFR
        const dialog = dialogRef.current;
        if (dialog) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const modalInstance = (window as any).dsfr?.(dialog)?.modal;
          if (modalInstance) modalInstance.conceal();
        }
        onSuccess();
      } else {
        setError(result.error || "Erreur lors du désarchivage");
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
                  D&eacute;sarchiver le dossier ?
                </h1>
                <p>Le dossier sera de nouveau visible dans vos dossiers suivis.</p>

                {error && (
                  <div className="fr-alert fr-alert--error fr-alert--sm fr-mb-2w">
                    <p>{error}</p>
                  </div>
                )}
              </div>
              <div className="fr-modal__footer">
                <ul className="fr-btns-group fr-btns-group--right fr-btns-group--inline-reverse fr-btns-group--inline-lg">
                  <li>
                    <button type="button" className="fr-btn" disabled={isSubmitting} onClick={handleSubmit}>
                      {isSubmitting ? "D\u00e9sarchivage..." : "D\u00e9sarchiver"}
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
