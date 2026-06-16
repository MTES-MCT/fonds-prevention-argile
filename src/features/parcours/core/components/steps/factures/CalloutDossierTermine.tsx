"use client";

import Link from "next/link";
import { useParcours } from "../../../context/useParcours";
import { Step } from "../../../domain";

export default function CalloutDossierTermine() {
  const { getDossierUrl } = useParcours();

  const dsUrl = getDossierUrl(Step.FACTURES);

  return (
    <div className="fr-callout fr-callout--green-emeraude fr-icon-success-line">
      <p className="fr-callout__title">Votre dossier est terminé</p>
      <p className="fr-callout__text">
        Toutes les étapes de votre dossier ont été effectuées et le paiement des travaux a été réalisé. Toutes vos
        réponses restent accessibles sur Démarches Simplifiées.
      </p>
      {dsUrl && (
        <Link
          href={dsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="fr-btn fr-btn--secondary fr-btn--icon-right fr-icon-external-link-line">
          Voir mes réponses
        </Link>
      )}
    </div>
  );
}
