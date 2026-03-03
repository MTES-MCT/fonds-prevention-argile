"use client";

import { useEffect, useRef } from "react";

interface ConfirmationSaveModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isLoading?: boolean;
  /** Si true, affiche un avertissement d'inéligibilité dans la modale */
  isIneligible?: boolean;
}

/**
 * Modale de confirmation avant enregistrement des modifications de simulation.
 * Utilise le composant modale DSFR.
 */
export function ConfirmationSaveModal({
  isOpen,
  onClose,
  onConfirm,
  isLoading,
  isIneligible,
}: ConfirmationSaveModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  // Gérer l'ouverture/fermeture via le DSFR
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const modalInstance = (window as any).dsfr?.(dialog)?.modal;

    if (!modalInstance) {
      console.warn("DSFR modal instance not found");
      return;
    }

    if (isOpen) {
      modalInstance.disclose();
    } else {
      modalInstance.conceal();
    }
  }, [isOpen]);

  // Écouter la fermeture de la modale par le DSFR (clic en dehors, Escape, etc.)
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleConceal = () => {
      onClose();
    };

    dialog.addEventListener("dsfr.conceal", handleConceal);
    return () => {
      dialog.removeEventListener("dsfr.conceal", handleConceal);
    };
  }, [onClose]);

  return (
    <dialog
      ref={dialogRef}
      id="modal-confirmation-save-simulation"
      className="fr-modal"
      aria-labelledby="modal-confirmation-save-title">
      <div className="fr-container fr-container--fluid fr-container-md">
        <div className="fr-grid-row fr-grid-row--center">
          <div className="fr-col-12 fr-col-md-8 fr-col-lg-6">
            <div className="fr-modal__body">
              <div className="fr-modal__header">
                <button
                  aria-controls="modal-confirmation-save-simulation"
                  title="Fermer"
                  type="button"
                  className="fr-btn--close fr-btn">
                  Fermer
                </button>
              </div>
              <div className="fr-modal__content">
                <h1 id="modal-confirmation-save-title" className="fr-modal__title">
                  <span className="fr-icon-arrow-right-line fr-icon--lg fr-mr-2v" aria-hidden="true"></span>
                  Confirmer la mise à jour des données ?
                </h1>
                {isIneligible && (
                  <div className="fr-alert fr-alert--warning fr-mb-2w">
                    <h3 className="fr-alert__title">Attention, ces modifications rendent la demande inéligible :</h3>
                    <ul>
                      <li>Le demandeur ne pourra pas bénéficier de subventions</li>
                      <li>Vous devez l&apos;informer des changements</li>
                      <li>Le dossier sera déplacé dans la catégorie &quot;Archivés&quot;.</li>
                    </ul>
                  </div>
                )}
                <p>Cette action est irréversible.</p>
              </div>
              <div className="fr-modal__footer">
                <ul className="fr-btns-group fr-btns-group--right fr-btns-group--inline-reverse fr-btns-group--inline-lg">
                  <li>
                    <button
                      type="button"
                      className="fr-btn"
                      style={
                        isIneligible ? { backgroundColor: "var(--background-action-high-red-marianne)" } : undefined
                      }
                      onClick={onConfirm}
                      disabled={isLoading}>
                      {isLoading ? "Enregistrement..." : isIneligible ? "Confirmer l'inéligibilité" : "Confirmer"}
                    </button>
                  </li>
                  <li>
                    <button type="button" className="fr-btn fr-btn--secondary" onClick={onClose} disabled={isLoading}>
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
