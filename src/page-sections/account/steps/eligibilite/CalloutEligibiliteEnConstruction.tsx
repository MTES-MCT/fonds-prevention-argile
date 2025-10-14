"use client";

import Link from "next/link";
import { Step } from "@/lib/parcours/parcours.types";
import { useParcours } from "@/lib/parcours/hooks/useParcours";

export default function CalloutEligibiliteEnConstruction() {
  const { getDossierUrl } = useParcours();

  // Récupérer directement l'URL depuis le context
  const dsUrl = getDossierUrl(Step.ELIGIBILITE);

  // Si pas d'URL disponible
  if (!dsUrl) {
    return (
      <div className="fr-callout fr-callout--yellow-moutarde fr-icon-info-line">
        <p className="fr-callout__title">
          Vous avez vu votre AMO et vous avez vérifié votre éligibilité ? Remplissez votre formulaire d’éligibilité
        </p>
        <p className="fr-callout__text">
          Après avoir choisi votre AMO (Assistant à Maîtrise d’Ouvrage,
          obligatoire), complétez le formulaire d’éligibilité et soumettez-le
          pour examen. Vous recevrez une notification lorsque l’instructeur aura
          pris sa décision.
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
      <p className="fr-callout__title">
        Vous avez vu votre AMO et vous avez vérifié votre éligibilité ? Remplissez votre formulaire d’éligibilité
      </p>
      <p className="fr-callout__text">
        Après avoir choisi votre AMO (Assistant à Maîtrise d’Ouvrage,
        obligatoire), complétez le formulaire d’éligibilité et soumettez-le pour
        examen. Vous recevrez une notification lorsque l’instructeur aura pris
        sa décision.
      </p>
      <Link
        href={dsUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="fr-btn fr-btn--icon-right fr-icon-external-link-line"
      >
        Reprendre le formulaire d'éligibilité
      </Link>
    </div>
  );
}
