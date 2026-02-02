"use client";

import { useState } from "react";
import type { InfoDemandeur as InfoDemandeurType } from "@/features/backoffice/espace-agent/demande/domain/types";
import { formatNomComplet, formatDate } from "@/shared/utils";
import Link from "next/dist/client/link";

interface InfoDemandeurProps {
  demandeur: InfoDemandeurType;
  /** Date depuis laquelle le dossier est suivi (optionnel, affiché sous le titre) */
  suiviDepuis?: Date;
}

/**
 * Composant affichant les informations du demandeur
 */
export function InfoDemandeur({ demandeur, suiviDepuis }: InfoDemandeurProps) {
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
          {suiviDepuis && (
            <p className="fr-card__desc fr-text--sm">Suivi depuis le {formatDate(suiviDepuis.toISOString())}</p>
          )}
          <dl
            className="fr-card__desc fr-mt-4w fr-m-0"
            style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "0.5rem 1rem", alignItems: "baseline" }}>
            {demandeur.adresse && (
              <>
                <dt className="fr-text">adresse :</dt>
                <dd className="fr-m-0">{demandeur.adresse}</dd>
              </>
            )}
            {demandeur.telephone && (
              <>
                <dt className="fr-text">tél. :</dt>
                <dd className="fr-m-0">{demandeur.telephone}</dd>
              </>
            )}
            {demandeur.email && (
              <>
                <dt className="fr-text">mail :</dt>
                <dd className="fr-m-0">
                  <Link
                    href="#"
                    id="link-13"
                    target="_self"
                    onClick={handleCopyEmail}
                    className="fr-link fr-link--sm fr-icon-clipboard-line fr-link--icon-right">
                    {demandeur.email}
                  </Link>
                  {emailCopied && <span className="fr-ml-2w fr-text--sm">Copié !</span>}
                </dd>
              </>
            )}
          </dl>
        </div>
      </div>
    </div>
  );
}
