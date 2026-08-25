"use client";

import { useState } from "react";
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
  const [dsNumber, setDsNumber] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  async function handleSubmit() {
    setError(null);
    setIsSubmitting(true);

    try {
      const result = await rattacherDossierDnAction(parcoursId, dsNumber);
      if (result.success) {
        setDsNumber("");
        onSuccess();
      } else {
        setError(result.error);
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <dialog open className="fr-modal fr-modal--opened" aria-labelledby="rattacher-dn-titre">
      <div className="fr-container fr-container--fluid fr-container-md">
        <div className="fr-grid-row fr-grid-row--center">
          <div className="fr-col-12 fr-col-md-8 fr-col-lg-6">
            <div className="fr-modal__body">
              <div className="fr-modal__header">
                <button type="button" className="fr-btn--close fr-btn" onClick={onClose}>
                  Fermer
                </button>
              </div>

              <div className="fr-modal__content">
                <h2 id="rattacher-dn-titre" className="fr-modal__title">
                  Rattacher un dossier Démarches Numériques
                </h2>

                <p>
                  À utiliser quand le demandeur a déposé son dossier sans passer par le lien du Fonds Prévention Argile
                  : son dossier existe côté Démarches Numériques, mais rien ne le relie à ce parcours.
                </p>
                <p className="fr-text--sm">
                  Le numéro figure en haut du dossier côté Démarches Numériques. Le dossier doit avoir été
                  <strong> transmis</strong> : un brouillon non déposé n'est pas visible de notre côté.
                </p>

                {error && (
                  <div className="fr-alert fr-alert--error fr-alert--sm fr-mb-2w">
                    <p>{error}</p>
                  </div>
                )}

                <div className="fr-input-group">
                  <label className="fr-label" htmlFor="rattacher-dn-numero">
                    Numéro du dossier
                  </label>
                  <input
                    id="rattacher-dn-numero"
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
                      onClick={handleSubmit}
                      disabled={isSubmitting || dsNumber.trim().length === 0}>
                      {isSubmitting ? "Vérification…" : "Rattacher"}
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
