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
          <dl
            className="fr-card__desc fr-mt-4w fr-m-0"
            style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "0.5rem 1rem" }}>
            {demandeur.adresse && (
              <>
                <dt className="fr-text--lg">adresse :</dt>
                <dd className="fr-m-0 fr-text--lg">{demandeur.adresse}</dd>
              </>
            )}
            {demandeur.telephone && (
              <>
                <dt className="fr-text--lg">tél. :</dt>
                <dd className="fr-m-0 fr-text--lg">{demandeur.telephone}</dd>
              </>
            )}
            {demandeur.email && (
              <>
                <dt className="fr-text--lg">mail :</dt>
                <dd className="fr-m-0 fr-text--lg">
                  <Link
                    href="#"
                    id="link-13"
                    target="_self"
                    onClick={handleCopyEmail}
                    className="fr-link fr-icon-clipboard-line fr-link--icon-right">
                    {demandeur.email}
                  </Link>
                  {emailCopied && <span className="fr-ml-2w">Copié !</span>}
                </dd>
              </>
            )}
          </dl>
        </div>
      </div>
    </div>
  );
}
