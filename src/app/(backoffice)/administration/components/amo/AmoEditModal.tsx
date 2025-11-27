"use client";

import { useState } from "react";
import type { Amo } from "@/features/parcours/amo";
import { updateAmo } from "@/features/backoffice";

interface AmoEditModalProps {
  amo: Amo & {
    communes?: { codeInsee: string }[];
    epci?: { codeEpci: string }[];
  };
  onClose: () => void;
  onSuccess: () => void;
}

export function AmoEditModal({ amo, onClose, onSuccess }: AmoEditModalProps) {
  const modalId = `modal-edit-amo`;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    nom: amo.nom,
    siret: amo.siret || "",
    departements: amo.departements || "",
    emails: amo.emails || "",
    telephone: amo.telephone || "",
    adresse: amo.adresse || "",
    communes: amo.communes?.map((c) => c.codeInsee).join(", ") || "",
    epci: amo.epci?.map((e) => e.codeEpci).join(", ") || "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const result = await updateAmo(amo.id, {
        ...formData,
        communes: formData.communes
          .split(",")
          .map((c) => c.trim())
          .filter(Boolean),
        epci: formData.epci
          .split(",")
          .map((e) => e.trim())
          .filter(Boolean),
      });

      if (result.success) {
        // Fermer la modale avec l'API DSFR
        const modal = document.getElementById(modalId);
        if (modal && window.dsfr) {
          window.dsfr(modal).modal.conceal();
        }

        onSuccess();
        onClose();
      } else {
        setError(result.error || "Erreur lors de la mise à jour");
      }
    } catch (err) {
      setError("Erreur inattendue");
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setError(null);
    onClose();
  };

  return (
    <dialog id={modalId} className="fr-modal" aria-labelledby={`${modalId}-title`}>
      <div className="fr-container fr-container--fluid fr-container-md">
        <div className="fr-grid-row fr-grid-row--center">
          <div className="fr-col-12 fr-col-md-10 fr-col-lg-8">
            <div className="fr-modal__body">
              <div className="fr-modal__header">
                <button
                  aria-controls={modalId}
                  title="Fermer"
                  type="button"
                  className="fr-btn--close fr-btn"
                  onClick={handleClose}>
                  Fermer
                </button>
              </div>
              <div className="fr-modal__content">
                <h2 id={`${modalId}-title`} className="fr-modal__title">
                  Modifier l'AMO
                </h2>

                {error && (
                  <div className="fr-alert fr-alert--error fr-mb-3w">
                    <p>{error}</p>
                  </div>
                )}

                <form onSubmit={handleSubmit}>
                  {/* ... tous les champs du formulaire inchangés ... */}
                  <div className="fr-input-group">
                    <label className="fr-label" htmlFor={`${modalId}-nom`}>
                      <strong>Nom</strong> *
                    </label>
                    <input
                      className="fr-input"
                      type="text"
                      id={`${modalId}-nom`}
                      required
                      value={formData.nom}
                      onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                    />
                  </div>

                  <div className="fr-input-group">
                    <label className="fr-label" htmlFor={`${modalId}-siret`}>
                      SIRET
                    </label>
                    <input
                      className="fr-input"
                      type="text"
                      disabled
                      id={`${modalId}-siret`}
                      value={formData.siret}
                      onChange={(e) => setFormData({ ...formData, siret: e.target.value })}
                    />
                  </div>

                  <div className="fr-input-group">
                    <label className="fr-label" htmlFor={`${modalId}-departements`}>
                      <strong>Département</strong>*
                    </label>
                    <input
                      className="fr-input"
                      type="text"
                      id={`${modalId}-departements`}
                      required
                      placeholder="Ex: Seine-et-Marne 77, Essonne 91"
                      value={formData.departements}
                      onChange={(e) => setFormData({ ...formData, departements: e.target.value })}
                    />
                  </div>

                  <div className="fr-input-group">
                    <label className="fr-label" htmlFor={`${modalId}-emails`}>
                      <strong>Email</strong> *
                    </label>
                    <input
                      className="fr-input"
                      type="text"
                      id={`${modalId}-emails`}
                      required
                      placeholder="email1@test.fr;email2@test.fr"
                      value={formData.emails}
                      onChange={(e) => setFormData({ ...formData, emails: e.target.value })}
                    />
                  </div>

                  <div className="fr-input-group">
                    <label className="fr-label" htmlFor={`${modalId}-telephone`}>
                      Téléphone
                    </label>
                    <input
                      className="fr-input"
                      type="tel"
                      id={`${modalId}-telephone`}
                      value={formData.telephone}
                      onChange={(e) => setFormData({ ...formData, telephone: e.target.value })}
                    />
                  </div>

                  <div className="fr-input-group">
                    <label className="fr-label" htmlFor={`${modalId}-adresse`}>
                      Adresse
                    </label>
                    <textarea
                      className="fr-input"
                      id={`${modalId}-adresse`}
                      rows={3}
                      value={formData.adresse}
                      onChange={(e) => setFormData({ ...formData, adresse: e.target.value })}
                    />
                  </div>

                  <div className="fr-input-group">
                    <label className="fr-label" htmlFor={`${modalId}-epci`}>
                      Codes EPCI
                    </label>
                    <input
                      className="fr-input"
                      type="text"
                      id={`${modalId}-epci`}
                      placeholder="200054781, 200054807"
                      value={formData.epci}
                      onChange={(e) => setFormData({ ...formData, epci: e.target.value })}
                    />
                    <p className="fr-hint-text">Codes EPCI séparés par des virgules</p>
                  </div>

                  <div className="fr-input-group">
                    <label className="fr-label" htmlFor={`${modalId}-communes`}>
                      Codes INSEE spécifiques
                    </label>
                    <input
                      className="fr-input"
                      type="text"
                      id={`${modalId}-communes`}
                      placeholder="75001, 75002, 75003"
                      value={formData.communes}
                      onChange={(e) => setFormData({ ...formData, communes: e.target.value })}
                    />
                    <p className="fr-hint-text">Codes INSEE séparés par des virgules</p>
                  </div>

                  <div className="fr-modal__footer fr-mt-4v">
                    <ul className="fr-btns-group fr-btns-group--right fr-btns-group--inline-lg">
                      <li>
                        <button type="button" className="fr-btn fr-btn--secondary" aria-controls={modalId}>
                          Annuler
                        </button>
                      </li>
                      <li>
                        <button type="submit" className="fr-btn" disabled={isSubmitting}>
                          {isSubmitting ? "Enregistrement..." : "Enregistrer"}
                        </button>
                      </li>
                    </ul>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </dialog>
  );
}
