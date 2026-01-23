"use client";

import { useState } from "react";
import type { InfoDemandeur as InfoDemandeurType } from "@/features/backoffice/espace-amo/demande/domain/types";
import { formatNomComplet } from "@/shared/utils";
import Link from "next/dist/client/link";

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
    <div className="fr-card">
      <div className="fr-card__body">
        <div className="fr-card__content">
          <h3 className="fr-card__title">
            <span className="fr-icon-user-line fr-mr-2v" aria-hidden="true"></span>
            {formatNomComplet(demandeur.prenom, demandeur.nom)}
          </h3>
          <div className="fr-card__desc">
            <ul className="fr-raw-list">
              {demandeur.adresse && (
                <li className="fr-mb-2v">
                  <span className="fr-text--lg">
                    adresse : <strong>{demandeur.adresse}</strong>
                  </span>
                </li>
              )}
              {demandeur.telephone && (
                <li className="fr-mb-2v">
                  <span className="fr-text--lg">
                    tél : <strong>{demandeur.telephone}</strong>
                  </span>
                </li>
              )}
              {demandeur.email && (
                <li className="fr-mb-2v">
                  <span className="fr-text--lg">
                    mail :{" "}
                    <strong>
                      <Link
                        href="#"
                        id="link-13"
                        target="_self"
                        onClick={handleCopyEmail}
                        className="fr-link fr-icon-clipboard-line fr-link--icon-right">
                        {demandeur.email}
                      </Link>
                    </strong>
                  </span>
                  {emailCopied && <span className="fr-ml-2w">Copié !</span>}
                </li>
              )}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
