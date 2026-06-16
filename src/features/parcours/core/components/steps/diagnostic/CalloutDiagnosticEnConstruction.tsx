"use client";

import Link from "next/link";
import { useParcours } from "../../../context/useParcours";
import { Step } from "../../../domain";

export default function CalloutDiagnosticEnConstruction() {
  const { getDossierUrl } = useParcours();

  const dsUrl = getDossierUrl(Step.DIAGNOSTIC);

  return (
    <div className="fr-callout fr-callout--blue-france fr-icon-info-line">
      <p className="fr-callout__title">Votre diagnostic est en attente d&apos;instruction.</p>
      <p className="fr-callout__text">
        Un instructeur analysera prochainement votre diagnostic. Vous recevrez une notification lorsqu&apos;il aura pris
        sa décision.
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
