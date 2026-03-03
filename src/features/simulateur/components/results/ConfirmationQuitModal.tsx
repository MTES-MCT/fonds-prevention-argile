"use client";

import { useEffect, useRef } from "react";

interface ConfirmationQuitModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

/**
 * Modale de confirmation avant de quitter l'édition sans enregistrer.
 * Utilise le composant modale DSFR.
 */
export function ConfirmationQuitModal({ isOpen, onClose, onConfirm }: ConfirmationQuitModalProps) {
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
      id="modal-confirmation-quit-simulation"
      className="fr-modal"
      aria-labelledby="modal-confirmation-quit-title">
      <div className="fr-container fr-container--fluid fr-container-md">
        <div className="fr-grid-row fr-grid-row--center">
          <div className="fr-col-12 fr-col-md-8 fr-col-lg-6">
            <div className="fr-modal__body">
              <div className="fr-modal__header">
                <button
                  aria-controls="modal-confirmation-quit-simulation"
                  title="Fermer"
                  type="button"
                  className="fr-btn--close fr-btn">
                  Fermer
                </button>
              </div>
              <div className="fr-modal__content">
                <h1 id="modal-confirmation-quit-title" className="fr-modal__title">
                  <span className="fr-icon-arrow-right-line fr-icon--lg fr-mr-2v" aria-hidden="true"></span>
                  Quitter sans enregistrer ?
                </h1>
                <p>Vos modifications seront perdues.</p>
              </div>
              <div className="fr-modal__footer">
                <ul className="fr-btns-group fr-btns-group--right fr-btns-group--inline-reverse fr-btns-group--inline-lg">
                  <li>
                    <button type="button" className="fr-btn" onClick={onConfirm}>
                      Quitter sans enregistrer
                    </button>
                  </li>
                  <li>
                    <button type="button" className="fr-btn fr-btn--secondary" onClick={onClose}>
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
