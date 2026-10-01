"use client";

import Link from "next/link";
import { useParcours } from "../../../context/useParcours";
import { Step } from "../../../domain";
import { useFormulaireGereParAmo } from "../../../hooks/useFormulaireGereParAmo";

export default function CalloutDiagnosticEnConstruction() {
  const { getDossierUrl } = useParcours();

  const dsUrl = getDossierUrl(Step.DIAGNOSTIC);
  // Dossier déposé par l'AMO : il vit sur son compte DN, le demandeur ne peut pas l'ouvrir.
  const gereParAmo = useFormulaireGereParAmo(Step.DIAGNOSTIC);

  return (
    <div className="fr-callout fr-callout--blue-france fr-icon-info-line">
      <p className="fr-callout__title">Votre diagnostic est en attente d&apos;instruction.</p>
      <p className="fr-callout__text">
        {gereParAmo
          ? "Votre AMO a transmis la demande de paiement du diagnostic. Un instructeur l'analysera prochainement ; sa décision vous sera indiquée ici."
          : "Un instructeur analysera prochainement votre diagnostic. Vous recevrez une notification lorsqu'il aura pris sa décision."}
      </p>
      {dsUrl && !gereParAmo && (
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
