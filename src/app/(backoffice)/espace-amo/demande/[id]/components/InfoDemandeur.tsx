"use client";

import { useState } from "react";
import type { InfoDemandeur as InfoDemandeurType } from "@/features/backoffice/espace-amo/demande/domain/types";
import { formatNomComplet } from "@/shared/utils";

interface InfoDemandeurProps {
  demandeur: InfoDemandeurType;
}

/**
 * Composant affichant les informations du demandeur
 */
export function InfoDemandeur({ demandeur }: InfoDemandeurProps) {
  const [emailCopied, setEmailCopied] = useState(false);

  const handleCopyEmail = async () => {
    if (demandeur.email) {
      try {
        await navigator.clipboard.writeText(demandeur.email);
        setEmailCopied(true);
        setTimeout(() => setEmailCopied(false), 2000);
      } catch (err) {
        console.error("Erreur lors de la copie:", err);
      }
    }
  };

  return (
    <div className="fr-card fr-card--no-border fr-card--shadow">
      <div className="fr-card__body">
        <div className="fr-card__content">
          <h3 className="fr-card__title">
            <span className="fr-icon-user-fill fr-icon--sm fr-mr-2v" aria-hidden="true"></span>
            {formatNomComplet(demandeur.prenom, demandeur.nom)}
          </h3>
          <div className="fr-card__desc">
            <ul className="fr-raw-list">
              {demandeur.adresse && (
                <li className="fr-mb-2v">
                  <strong className="fr-text--bold">adresse :</strong> {demandeur.adresse}
                </li>
              )}
              {demandeur.telephone && (
                <li className="fr-mb-2v">
                  <strong className="fr-text--bold">tél :</strong> {demandeur.telephone}
                </li>
              )}
              {demandeur.email && (
                <li className="fr-mb-2v">
                  <strong className="fr-text--bold">mail :</strong> {demandeur.email}
                  <button
                    type="button"
                    className="fr-btn fr-btn--tertiary-no-outline fr-btn--sm fr-ml-2v"
                    title="Copier l'email"
                    onClick={handleCopyEmail}>
                    <span
                      className={emailCopied ? "fr-icon-check-line" : "fr-icon-clipboard-line"}
                      aria-hidden="true"></span>
                    {emailCopied && <span className="fr-ml-1v">Copié !</span>}
                  </button>
                </li>
              )}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
