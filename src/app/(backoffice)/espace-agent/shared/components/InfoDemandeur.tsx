"use client";

import { useState } from "react";
import type { InfoDemandeur as InfoDemandeurType } from "@/features/backoffice/espace-agent/demandes/domain/types";
import { SOURCE_ACQUISITION_LABELS } from "@/shared/domain/value-objects";
import { formatNomComplet, formatDate } from "@/shared/utils";
import Link from "next/dist/client/link";

/** AMO rattachée au dossier ; `null` = le demandeur est en autonomie. */
export interface InfoDemandeurAmo {
  nom: string;
  estMandataireFinancier: boolean | null;
}

interface InfoDemandeurProps {
  demandeur: InfoDemandeurType;
  /** Date depuis laquelle le dossier est suivi (optionnel, affiché sous le titre) */
  suiviDepuis?: Date;
  /** Lien vers la page d'édition des données de simulation (optionnel) */
  editSimulationHref?: string;
  /** Éligibilité attestée par l'AMO. Omis = ligne masquée. */
  eligibiliteConfirmee?: boolean;
  /** AMO rattachée (`null` = autonomie). Omis = ligne masquée. */
  amo?: InfoDemandeurAmo | null;
}

/**
 * Composant affichant les informations du demandeur
 */
export function InfoDemandeur({
  demandeur,
  suiviDepuis,
  editSimulationHref,
  eligibiliteConfirmee,
  amo,
}: InfoDemandeurProps) {
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
    <div
      className="fr-p-3w"
      style={{ background: "var(--background-default-grey)", border: "1px solid var(--border-default-grey)" }}>
      <h3 className="fr-h6 fr-mb-1w">
        <span className="fr-icon-user-line fr-mr-2v" aria-hidden="true"></span>
        {formatNomComplet(demandeur.prenom, demandeur.nom)}
      </h3>
      {suiviDepuis && (
        <p className="fr-text--sm fr-mb-0 fr-text-mention--grey">
          Suivi depuis le {formatDate(suiviDepuis.toISOString())}
        </p>
      )}
      <dl
        className="fr-mt-2w fr-mb-0"
        style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "0.5rem 1rem", alignItems: "baseline" }}>
        {demandeur.nomFamille && demandeur.nomFamille !== demandeur.nom && (
          <>
            <dt className="fr-text">Nom de famille :</dt>
            <dd className="fr-m-0">{demandeur.nomFamille}</dd>
          </>
        )}
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
        {demandeur.sourceAcquisition && (
          <>
            <dt className="fr-text">Acquisition :</dt>
            <dd className="fr-m-0">
              {SOURCE_ACQUISITION_LABELS[demandeur.sourceAcquisition]}
              {demandeur.sourceAcquisitionPrecision && (
                <span className="fr-text--sm fr-text--mention-grey fr-ml-1w">
                  ({demandeur.sourceAcquisitionPrecision})
                </span>
              )}
            </dd>
          </>
        )}
        {eligibiliteConfirmee !== undefined && (
          <>
            <dt className="fr-text">Éligibilité :</dt>
            <dd className="fr-m-0">
              <p className={`fr-badge fr-badge--sm ${eligibiliteConfirmee ? "fr-badge--success" : "fr-badge--info"}`}>
                {eligibiliteConfirmee ? "CONFIRMÉE" : "À CONFIRMER"}
              </p>
              {editSimulationHref && (
                <Link
                  href={editSimulationHref}
                  className="fr-link fr-link--sm fr-icon-edit-line fr-ml-1w"
                  title="Vérifier ou modifier les données d'éligibilité"
                  aria-label="Vérifier ou modifier les données d'éligibilité"
                />
              )}
            </dd>
          </>
        )}
        {amo !== undefined && (
          <>
            <dt className="fr-text">AMO :</dt>
            <dd className="fr-m-0">
              {amo === null ? (
                <p className="fr-badge fr-badge--sm fr-badge--info">EN AUTONOMIE</p>
              ) : (
                <>
                  {amo.nom}
                  {amo.estMandataireFinancier === true && (
                    <p className="fr-badge fr-badge--sm fr-badge--blue-ecume fr-mt-1v">MANDATAIRE FINANCIER</p>
                  )}
                </>
              )}
            </dd>
          </>
        )}
      </dl>

      {editSimulationHref && (
        <div className="fr-mt-3w">
          <Link
            href={editSimulationHref}
            className="fr-btn fr-btn--secondary fr-btn--sm fr-icon-pass-valid-line fr-btn--icon-left">
            Vérifier son éligibilité
          </Link>
        </div>
      )}
    </div>
  );
}
