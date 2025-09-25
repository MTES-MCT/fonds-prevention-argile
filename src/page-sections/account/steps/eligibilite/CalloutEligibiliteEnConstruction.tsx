"use client";

import Link from "next/link";
import { Step, DSStatus } from "@/lib/parcours/parcours.types";
import { useDossierDS } from "@/hooks";

export default function CalloutEligibiliteEnConstruction() {
  const { dsUrl, isLoading, error } = useDossierDS({
    step: Step.ELIGIBILITE,
    status: DSStatus.EN_CONSTRUCTION,
  });

  // Si on charge encore les données
  if (isLoading) {
    return (
      <div className="fr-callout fr-callout--yellow-moutarde fr-icon-info-line">
        <p className="fr-callout__title">À FAIRE</p>
        <p className="fr-callout__text">
          Chargement de votre dossier en cours...
        </p>
      </div>
    );
  }

  // Si erreur ou pas d'URL
  if (error || !dsUrl) {
    return (
      <div className="fr-callout fr-callout--yellow-moutarde fr-icon-info-line">
        <p className="fr-callout__title">À FAIRE</p>
        <p className="fr-callout__text">
          Il est essentiel de compléter et de soumettre le premier formulaire
          pour que votre dossier soit examiné par les autorités compétentes. Par
          la suite, vous recevrez une notification concernant les étapes à
          suivre.
        </p>
        <button className="fr-btn fr-btn--secondary" disabled>
          Lien du formulaire non disponible
        </button>
      </div>
    );
  }

  // Affichage normal avec le lien
  return (
    <div className="fr-callout fr-callout--yellow-moutarde fr-icon-info-line">
      <p className="fr-callout__title">À FAIRE</p>
      <p className="fr-callout__text">
        Il est essentiel de compléter et de soumettre le premier formulaire pour
        que votre dossier soit examiné par les autorités compétentes. Par la
        suite, vous recevrez une notification concernant les étapes à suivre.
      </p>
      <Link
        href={dsUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="fr-btn fr-btn--icon-right fr-icon-arrow-right-s-line"
      >
        Reprendre le formulaire d'éligibilité
      </Link>
    </div>
  );
}
