"use client";

import { useState, useEffect, useRef } from "react";
import { updateContactInfoAction } from "../actions/contact-info.actions";
import { SourceAcquisition, SOURCE_ACQUISITION_LABELS } from "@/shared/domain/value-objects";

interface ContactInfoModalProps {
  isOpen: boolean;
  defaultEmail?: string;
  onClose: () => void;
  onSuccess: () => void;
}

// À l'inscription, l'adresse du ménage n'est pas encore connue (la simulation RGA
// n'a pas eu lieu). On propose donc l'option générique ECFR pour couvrir tous les
// acteurs locaux (DDT, AMO, Aller-vers). Ces acteurs pourront être proposés
// nominativement après la simulation, quand le département sera connu.
const SOURCE_OPTIONS: SourceAcquisition[] = [
  SourceAcquisition.ECFR,
  SourceAcquisition.FLYERS,
  SourceAcquisition.MEDIAS,
  SourceAcquisition.BULLETIN_COMMUNAL,
  SourceAcquisition.PROS_BATIMENT_IMMOBILIER,
  SourceAcquisition.REUNION_PUBLIQUE_SALON,
  SourceAcquisition.MOTEUR_RECHERCHE,
  SourceAcquisition.AUTRE,
];

export default function ContactInfoModal({ isOpen, defaultEmail, onClose, onSuccess }: ContactInfoModalProps) {
  const [email, setEmail] = useState(defaultEmail || "");
  const [telephone, setTelephone] = useState("");
  const [sourceAcquisition, setSourceAcquisition] = useState<string>("");
  const [sourceAcquisitionPrecision, setSourceAcquisitionPrecision] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
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

  const handleSubmit = async () => {
    setError(null);

    if (!email?.trim()) {
      setError("L'adresse email est requise");
      return;
    }

    if (!telephone?.trim()) {
      setError("Le numéro de téléphone est requis");
      return;
    }

    if (!/^[0-9]{10}$/.test(telephone.trim())) {
      setError("Le numéro de téléphone doit contenir 10 chiffres");
      return;
    }

    if (!sourceAcquisition) {
      setError("Merci d'indiquer comment vous avez connu le fonds");
      return;
    }

    if (sourceAcquisition === SourceAcquisition.AUTRE && !sourceAcquisitionPrecision.trim()) {
      setError("Merci de préciser comment vous avez connu le fonds");
      return;
    }

    setIsSubmitting(true);

    const result = await updateContactInfoAction({
      emailContact: email.trim(),
      telephone: telephone.trim(),
      sourceAcquisition,
      sourceAcquisitionPrecision:
        sourceAcquisition === SourceAcquisition.AUTRE ? sourceAcquisitionPrecision.trim() : null,
    });

    setIsSubmitting(false);

    if (result.success) {
      onSuccess();
    } else {
      setError(result.error || "Erreur lors de la sauvegarde");
    }
  };

  return (
    <dialog ref={dialogRef} id="modal-contact-info" className="fr-modal" aria-labelledby="modal-contact-info-title">
      <div className="fr-container fr-container--fluid fr-container-md">
        <div className="fr-grid-row fr-grid-row--center">
          <div className="fr-col-12 fr-col-md-10 fr-col-lg-8">
            <div className="fr-modal__body">
              <div className="fr-modal__header">
                <button
                  aria-controls="modal-contact-info"
                  title="Fermer"
                  type="button"
                  className="fr-btn--close fr-btn">
                  Fermer
                </button>
              </div>
              <div className="fr-modal__content">
                {error && (
                  <div className="fr-alert fr-alert--error fr-mb-2w">
                    <p>{error}</p>
                  </div>
                )}

                <h2 id="modal-contact-info-title" className="fr-modal__title">
                  <span className="fr-icon-arrow-right-line fr-mr-1w" aria-hidden="true" />
                  Comment vous contacter ?
                </h2>

                <p>
                  Ces informations sont confidentielles et destinées à votre conseiller local mandaté par l&apos;État.
                  Il pourra vous contacter pour faciliter la complétion de votre dossier.
                </p>

                <div className="fr-form-group">
                  <label className="fr-label" htmlFor="contact-telephone-input">
                    <strong>Votre numéro de téléphone</strong>
                    <span className="fr-hint-text">Format attendu : 0123456789</span>
                  </label>
                  <input
                    className="fr-input"
                    type="tel"
                    id="contact-telephone-input"
                    name="telephone"
                    pattern="[0-9]{10}"
                    value={telephone}
                    onChange={(e) => setTelephone(e.target.value)}
                  />
                </div>

                <div className="fr-form-group fr-mt-2w">
                  <label className="fr-label" htmlFor="contact-email-input">
                    <strong>Votre adresse email de contact</strong>
                    <span className="fr-hint-text">Format attendu : nom@domaine.fr</span>
                  </label>
                  <input
                    className="fr-input"
                    type="email"
                    id="contact-email-input"
                    name="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>

                <div className="fr-select-group fr-mt-2w">
                  <label className="fr-label" htmlFor="contact-source-acquisition">
                    <strong>Comment avez-vous connu le fonds de prévention argile ?</strong>
                    <span className="fr-hint-text">
                      Cela nous aide à mieux faire connaître le dispositif sur votre territoire.
                    </span>
                  </label>
                  <select
                    className="fr-select"
                    id="contact-source-acquisition"
                    name="sourceAcquisition"
                    value={sourceAcquisition}
                    onChange={(e) => setSourceAcquisition(e.target.value)}>
                    <option value="">Sélectionnez une option</option>
                    {SOURCE_OPTIONS.map((value) => (
                      <option key={value} value={value}>
                        {SOURCE_ACQUISITION_LABELS[value]}
                      </option>
                    ))}
                  </select>
                </div>

                {sourceAcquisition === SourceAcquisition.AUTRE && (
                  <div className="fr-form-group fr-mt-2w">
                    <label className="fr-label" htmlFor="contact-source-acquisition-precision">
                      <strong>Pouvez-vous préciser ?</strong>
                    </label>
                    <input
                      className="fr-input"
                      type="text"
                      id="contact-source-acquisition-precision"
                      name="sourceAcquisitionPrecision"
                      maxLength={500}
                      value={sourceAcquisitionPrecision}
                      onChange={(e) => setSourceAcquisitionPrecision(e.target.value)}
                    />
                  </div>
                )}
              </div>
              <div className="fr-modal__footer">
                <ul className="fr-btns-group fr-btns-group--right fr-btns-group--inline-reverse fr-btns-group--inline-lg">
                  <li>
                    <button type="button" className="fr-btn" onClick={handleSubmit} disabled={isSubmitting}>
                      {isSubmitting ? "Enregistrement..." : "Valider"}
                    </button>
                  </li>
                  <li>
                    <button
                      type="button"
                      className="fr-btn fr-btn--secondary"
                      onClick={onClose}
                      disabled={isSubmitting}>
                      Ignorer
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
