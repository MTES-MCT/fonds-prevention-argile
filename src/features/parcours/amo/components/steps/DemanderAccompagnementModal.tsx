"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { demanderMonAccompagnement } from "../../actions/demande-accompagnement.actions";

const MODAL_ID = "modal-demander-accompagnement";

interface DemanderAccompagnementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Confirmation de la demande d'accompagnement par un AMO, après avoir choisi l'autonomie.
 * L'AMO attribué est celui qui couvre le territoire du demandeur (pas de choix manuel,
 * même mécanique que le "Oui" de `CalloutChoixAccompagnement`).
 */
export function DemanderAccompagnementModal({ isOpen, onClose }: DemanderAccompagnementModalProps) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // L'init du DSFR est asynchrone : on retry jusqu'à ce que l'instance modale existe.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    let cancelled = false;
    let attempts = 0;
    const MAX_ATTEMPTS = 30;

    const tryToggle = () => {
      if (cancelled) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const modalInstance = (window as any).dsfr?.(dialog)?.modal;
      if (modalInstance) {
        if (isOpen) modalInstance.disclose();
        else modalInstance.conceal();
        return;
      }
      if (++attempts < MAX_ATTEMPTS) {
        requestAnimationFrame(tryToggle);
      } else {
        console.warn("DSFR modal instance not ready after retries");
      }
    };

    tryToggle();
    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const handleConceal = () => onClose();
    dialog.addEventListener("dsfr.conceal", handleConceal);
    return () => dialog.removeEventListener("dsfr.conceal", handleConceal);
  }, [onClose]);

  const handleConfirm = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      const result = await demanderMonAccompagnement();
      if (result.success) {
        onClose();
        router.refresh();
      } else {
        setError(result.error || "Une erreur est survenue");
      }
    } catch (err) {
      console.error("Erreur demande accompagnement:", err);
      setError("Une erreur est survenue");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <dialog ref={dialogRef} id={MODAL_ID} className="fr-modal" aria-labelledby={`${MODAL_ID}-title`}>
      <div className="fr-container fr-container--fluid fr-container-md">
        <div className="fr-grid-row fr-grid-row--center">
          <div className="fr-col-12 fr-col-md-10 fr-col-lg-8">
            <div className="fr-modal__body">
              <div className="fr-modal__header">
                <button aria-controls={MODAL_ID} title="Fermer" type="button" className="fr-btn--close fr-btn">
                  Fermer
                </button>
              </div>
              <div className="fr-modal__content">
                {error && (
                  <div className="fr-alert fr-alert--error fr-mb-2w">
                    <p>{error}</p>
                  </div>
                )}

                <h2 id={`${MODAL_ID}-title`} className="fr-modal__title">
                  <span className="fr-icon-arrow-right-line fr-mr-1w" aria-hidden="true" />
                  Demander à être accompagné
                </h2>

                <p>
                  Un Assistant à Maîtrise d&apos;Ouvrage (AMO) de votre territoire va être mis en relation avec vous
                  pour vous accompagner dans vos démarches.
                </p>
                <p>Nous lui envoyons un e-mail pour l&apos;informer de votre demande.</p>
              </div>
              <div className="fr-modal__footer">
                <ul className="fr-btns-group fr-btns-group--right fr-btns-group--inline-reverse fr-btns-group--inline-lg">
                  <li>
                    <button type="button" className="fr-btn" disabled={isSubmitting} onClick={handleConfirm}>
                      {isSubmitting ? "Envoi en cours..." : "Demander à être accompagné"}
                    </button>
                  </li>
                  <li>
                    <button type="button" className="fr-btn fr-btn--secondary" aria-controls={MODAL_ID}>
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
