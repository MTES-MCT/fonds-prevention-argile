"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { annulerMonAccompagnement } from "../../actions/arret-accompagnement.actions";
import type { Amo } from "../../domain/entities";

const MODAL_ID = "modal-annuler-accompagnement";

interface AnnulerAccompagnementModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** true = l'AMO est mandataire financier et a validé : son accord est requis. */
  accordAmoRequis: boolean;
  entrepriseAmo: Amo | null;
}

/**
 * Confirmation de l'annulation de l'accompagnement par le demandeur.
 * Deux variantes selon que l'accord de l'AMO mandataire est requis ou non.
 */
export function AnnulerAccompagnementModal({
  isOpen,
  onClose,
  accordAmoRequis,
  entrepriseAmo,
}: AnnulerAccompagnementModalProps) {
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
      const result = await annulerMonAccompagnement();
      if (result.success) {
        onClose();
        router.refresh();
      } else {
        setError(result.error || "Une erreur est survenue");
      }
    } catch (err) {
      console.error("Erreur annulation accompagnement:", err);
      setError("Une erreur est survenue");
    } finally {
      setIsSubmitting(false);
    }
  };

  const title = accordAmoRequis ? "Vous devez demander validation à votre AMO" : "Annulation de l'accompagnement";
  const confirmLabel = accordAmoRequis ? "Demander à ne plus être accompagné" : "Ne plus être accompagné";

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
                  {title}
                </h2>

                {accordAmoRequis ? (
                  <>
                    <p>
                      Votre AMO est mandataire financier : vous ne pouvez pas annuler votre accompagnement sans son
                      accord. Nous allons lui transmettre votre demande par e-mail.
                    </p>
                    <p>Si vous n&apos;avez pas de réponse rapidement, n&apos;hésitez pas à le contacter directement.</p>
                    {entrepriseAmo && (
                      <div className="fr-callout fr-callout--blue-cumulus">
                        <p className="fr-callout__text fr-text--sm fr-mb-0">
                          <strong>{entrepriseAmo.nom}</strong>
                          <br />
                          {entrepriseAmo.emails.toString()}
                          <br />
                          {entrepriseAmo.telephone}
                          <br />
                          {entrepriseAmo.adresse}
                        </p>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <p>
                      Nous allons envoyer un e-mail à <strong>{entrepriseAmo?.nom ?? "votre AMO"}</strong> pour annuler
                      votre accompagnement.
                    </p>
                    <p>Vous pourrez gérer vos démarches en autonomie.</p>
                  </>
                )}
              </div>
              <div className="fr-modal__footer">
                <ul className="fr-btns-group fr-btns-group--right fr-btns-group--inline-reverse fr-btns-group--inline-lg">
                  <li>
                    <button type="button" className="fr-btn" disabled={isSubmitting} onClick={handleConfirm}>
                      {isSubmitting ? "Envoi en cours..." : confirmLabel}
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
