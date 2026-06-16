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
  const title = statutAmo === StatutValidationAmo.LOGEMENT_ELIGIBLE
    ? "Votre AMO a confirmé votre accompagnement ! Votre formulaire d'éligibilité est en attente d'instruction."
    : "Votre formulaire d'éligibilité est en attente d'instruction.";
  const description =
    "Un instructeur analysera prochainement vos réponses. Vous recevrez une notification lorsqu'il aura pris sa décision.";

  return (
    <div className="fr-callout fr-callout--blue-france fr-icon-info-line">
      <p className="fr-callout__title">{title}</p>
      <p className="fr-callout__text">{description}</p>
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
