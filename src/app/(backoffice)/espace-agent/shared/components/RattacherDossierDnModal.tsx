"use client";

import { useEffect, useRef, useState, useId } from "react";
import { rattacherDossierDnAction } from "@/features/backoffice/espace-agent/dossiers/actions/rattacher-dossier-dn.actions";

interface RattacherDossierDnModalProps {
  isOpen: boolean;
  onClose: () => void;
  parcoursId: string;
  onSuccess: () => void;
}

/**
 * Rattache un dossier Démarches Numériques existant au parcours, par son numéro.
 * Recours quand le demandeur a créé son dossier hors du lien FPA : il ne porte alors pas
 * l'annotation qui permettrait de le retrouver automatiquement (ADR-0027).
 */
export function RattacherDossierDnModal({ isOpen, onClose, parcoursId, onSuccess }: RattacherDossierDnModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [dsNumber, setDsNumber] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const uniqueId = useId();
  const modalId = `modal-rattacher-dn-${uniqueId}`;

  // Ouverture/fermeture via l'API DSFR : l'attribut HTML `open` ne suffit pas.
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
      const result = await rattacherDossierDnAction(parcoursId, dsNumber);

      if (result.success) {
        setDsNumber("");
        const dialog = dialogRef.current;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const modalInstance = dialog ? (window as any).dsfr?.(dialog)?.modal : null;
        if (modalInstance) modalInstance.conceal();
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
                  Rattacher un dossier D&eacute;marches Num&eacute;riques
                </h1>

                <p>
                  &Agrave; utiliser quand le demandeur a d&eacute;pos&eacute; son dossier sans passer par le lien du
                  Fonds Pr&eacute;vention Argile : son dossier existe c&ocirc;t&eacute; D&eacute;marches
                  Num&eacute;riques, mais rien ne le relie &agrave; ce parcours.
                </p>
                <p className="fr-text--sm">
                  Le num&eacute;ro figure en haut du dossier c&ocirc;t&eacute; D&eacute;marches Num&eacute;riques. Le
                  dossier doit avoir &eacute;t&eacute; <strong>transmis</strong> : un brouillon non d&eacute;pos&eacute;
                  n&apos;est pas visible de notre c&ocirc;t&eacute;.
                </p>

                {error && (
                  <div className="fr-alert fr-alert--error fr-alert--sm fr-mb-2w">
                    <p>{error}</p>
                  </div>
                )}

                <div className="fr-input-group">
                  <label className="fr-label" htmlFor={`${modalId}-numero`}>
                    Num&eacute;ro du dossier
                  </label>
                  <input
                    id={`${modalId}-numero`}
                    className="fr-input"
                    type="text"
                    inputMode="numeric"
                    value={dsNumber}
                    onChange={(e) => setDsNumber(e.target.value)}
                    placeholder="32052358"
                  />
                </div>
              </div>

              <div className="fr-modal__footer">
                <ul className="fr-btns-group fr-btns-group--right fr-btns-group--inline-reverse fr-btns-group--inline-lg">
                  <li>
                    <button
                      type="button"
                      className="fr-btn"
                      disabled={isSubmitting || dsNumber.trim().length === 0}
                      onClick={handleSubmit}>
                      {isSubmitting ? "Vérification..." : "Rattacher"}
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
