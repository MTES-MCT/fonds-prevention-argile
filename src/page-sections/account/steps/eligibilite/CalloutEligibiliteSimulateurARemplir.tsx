"use client";

import Link from "next/link";

export default function CalloutEligibiliteSimulateurARemplir() {
  return (
    <div className="fr-callout fr-callout--yellow-moutarde fr-icon-info-line">
      <p className="fr-callout__title">Simulation requise</p>
      <p className="fr-callout__text">
        Vous devez d'abord compléter le simulateur pour déterminer votre
        éligibilité avant de pouvoir soumettre votre dossier.
      </p>
      <Link
        href="/simulateur"
        className="fr-btn fr-btn--icon-right fr-icon-arrow-right-s-line"
      >
        Accéder au simulateur
      </Link>
    </div>
  );
}
