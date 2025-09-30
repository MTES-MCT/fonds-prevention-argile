"use client";

import { useState, FormEvent } from "react";
import { enregistrerEmail } from "@/lib/actions/email-notifications";

export default function EarlyAccessForm() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage("");
    setShowSuccess(false);

    const result = await enregistrerEmail(email);

    if (result.success) {
      setShowSuccess(true);
      setEmail("");
    } else {
      setErrorMessage(result.error || "Une erreur est survenue");
    }

    setIsSubmitting(false);
  };

  return (
    <section className="fr-container-fluid">
      <div className="fr-container">
        <div className="fr-grid-row items-center gap-6 md:gap-0">
          {/* Zone formulaire - Gauche */}
          <div className="fr-col-12 fr-col-md-6">
            <h2>
              Le Fonds de Prévention sera bientôt disponible dans votre
              département.
            </h2>
            <p className="fr-text--lead fr-mt-2w">
              Laissez-nous votre e-mail pour être informé de sa sortie et faire
              votre demande d'aides.
            </p>

            {showSuccess ? (
              <div className="fr-alert fr-alert--success fr-mt-4w">
                <h3 className="fr-alert__title">E-mail bien reçu !</h3>
                <p>
                  Nous vous informerons dès que le Fonds de Prévention sera
                  disponible dans votre département.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="fr-mt-4w">
                <div className="fr-input-group" id="early-access-email-group">
                  <label className="fr-label" htmlFor="early-access-email">
                    Adresse e-mail
                    <span className="fr-hint-text">
                      Format attendu : nom@domaine.fr
                    </span>
                  </label>
                  <div className="fr-input-wrap fr-input-wrap--addon">
                    <input
                      className={`fr-input ${errorMessage ? "fr-input--error" : ""}`}
                      aria-describedby="early-access-email-messages"
                      id="early-access-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      disabled={isSubmitting}
                      placeholder="votre.email@exemple.fr"
                    />
                    <button
                      type="submit"
                      className="fr-btn"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? "Envoi..." : "Envoyer"}
                    </button>
                  </div>
                  <div
                    className="fr-messages-group"
                    id="early-access-email-messages"
                    aria-live="polite"
                  >
                    {errorMessage && (
                      <p className="fr-message fr-message--error">
                        {errorMessage}
                      </p>
                    )}
                  </div>
                </div>
              </form>
            )}
          </div>

          {/* Zone cartes - Droite */}
          <div className="fr-col-12 fr-col-md-6 flex justify-center">
            <div className="flex flex-col gap-6 p-20">
              <div className="fr-tile fr-tile--horizontal fr-enlarge-link">
                <div className="fr-tile__body">
                  <div className="fr-tile__content">
                    <div className="fr-icon-government-fill fr-icon--sm mb-2 text-[var(--text-label-blue-france)]"></div>
                    <h3 className="fr-tile__title">Un service de l'État</h3>
                    <p className="fr-tile__desc">
                      Sécurisé, gratuit et opéré par l'État. Vos données ne sont
                      utilisées que pour l'instruction de votre dossier par des
                      professionels agrées.
                    </p>
                  </div>
                </div>
              </div>

              <div className="fr-tile fr-tile--horizontal fr-enlarge-link">
                <div className="fr-tile__body">
                  <div className="fr-tile__content">
                    <div className="fr-icon-draft-fill fr-icon--sm mb-2 text-blue-600"></div>
                    <h3 className="fr-tile__title">
                      Qui centralise votre démarche
                    </h3>
                    <p className="fr-tile__desc">
                      Avec tous les intermédiaires impliqués pour gagner du
                      temps et faciliter l'instruction de votre dossier.
                    </p>
                  </div>
                </div>
              </div>

              <div className="fr-tile fr-tile--horizontal fr-enlarge-link">
                <div className="fr-tile__body">
                  <div className="fr-tile__content">
                    <div className="fr-icon-shield-fill fr-icon--sm mb-2 text-green-800"></div>
                    <h3 className="fr-tile__title">
                      Pour agir avant les sinistres
                    </h3>
                    <p className="fr-tile__desc">
                      Bénéficiez d'un accompagnement pour diagnostiquer et
                      réaliser des travaux avant que votre logement ne soit
                      sinistré.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
