"use client";

import { useEffect, useRef, useState, useId } from "react";
import { rattacherAmoAction } from "@/features/backoffice/administration/diagnostics/actions/amo-a-rattacher.actions";

interface RattacherAmoModalProps {
  isOpen: boolean;
  onClose: () => void;
  parcoursId: string;
  /** AMO qui sera rattachée, et d'où elle vient — le super-admin doit la voir avant de confirmer. */
  amoNom: string;
  origine: "audit" | "territoire";
  onSuccess: () => void;
}

/**
 * Modale de confirmation du rattachement d'une AMO à un dossier détaché à tort (ADR-0037).
 * Même action que la file « AMO à rattacher » des diagnostics.
 */
export function RattacherAmoModal({ isOpen, onClose, parcoursId, amoNom, origine, onSuccess }: RattacherAmoModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const uniqueId = useId();
  const modalId = `modal-rattacher-amo-${uniqueId}`;

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
      const result = await rattacherAmoAction(parcoursId);

      if (result.success) {
        const dialog = dialogRef.current;
        if (dialog) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const modalInstance = (window as any).dsfr?.(dialog)?.modal;
          if (modalInstance) modalInstance.conceal();
        }
        onSuccess();
      } else {
        setError(result.error || "Erreur lors du rattachement");
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
                  Rattacher une AMO &agrave; ce dossier&nbsp;?
                </h1>
                <p>
                  <strong>{amoNom}</strong> sera rattach&eacute;e (
                  {origine === "audit" ? "AMO d'origine du dossier" : "AMO du territoire"}). L&apos;&eacute;tape du
                  parcours n&apos;est pas modifi&eacute;e et aucun email n&apos;est envoy&eacute;.
                </p>
                <p>
                  La demande repassera <strong>en attente de validation</strong> : l&apos;AMO devra re-confirmer
                  l&apos;&eacute;ligibilit&eacute;, la date de sa d&eacute;cision d&apos;origine ayant &eacute;t&eacute;
                  perdue au d&eacute;tachement. Pr&eacute;venez-la&nbsp;: le dossier r&eacute;appara&icirc;t sans
                  pr&eacute;avis dans sa file.
                </p>

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
                      {isSubmitting ? "Rattachement..." : "Rattacher l'AMO"}
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
