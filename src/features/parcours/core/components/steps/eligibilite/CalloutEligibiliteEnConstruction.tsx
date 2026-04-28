"use client";

import Link from "next/link";
import { useParcours } from "../../../context/useParcours";
import { Step } from "../../../domain";
import { StatutValidationAmo } from "@/features/parcours/amo/domain/value-objects";

export default function CalloutEligibiliteEnConstruction() {
  const { getDossierUrl, statutAmo } = useParcours();

  // Récupérer directement l'URL depuis le context
  const dsUrl = getDossierUrl(Step.ELIGIBILITE);

  // Quand l'AMO a validé l'accompagnement, on met en avant la confirmation dans le titre.
  const isAmoConfirmed = statutAmo === StatutValidationAmo.LOGEMENT_ELIGIBLE;
  const title = isAmoConfirmed
    ? "Votre AMO a confirmé votre accompagnement ! Vous pouvez remplir votre formulaire d'éligibilité"
    : "Remplissez votre formulaire d'éligibilité";
  const description =
    "Une fois votre formulaire rempli et soumis, un instructeur l'analysera. Vous recevrez une notification lorsqu'il aura pris sa décision.";

  // Si pas d'URL disponible
  if (!dsUrl) {
    return (
      <div className="fr-callout fr-callout--yellow-moutarde fr-icon-info-line">
        <p className="fr-callout__title">{title}</p>
        <p className="fr-callout__text">{description}</p>
        <button className="fr-btn fr-btn--secondary" disabled>
          Lien du formulaire non disponible
        </button>
      </div>
    );
  }

  // Affichage normal avec le lien
  return (
    <div className="fr-callout fr-callout--yellow-moutarde fr-icon-info-line">
      <p className="fr-callout__title">{title}</p>
      <p className="fr-callout__text">{description}</p>
      <Link
        href={dsUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="fr-btn fr-btn--icon-right fr-icon-external-link-line">
        Reprendre le formulaire d'éligibilité
      </Link>
    </div>
  );
}
