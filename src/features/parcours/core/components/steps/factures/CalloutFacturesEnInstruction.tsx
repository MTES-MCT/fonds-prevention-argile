"use client";

import Link from "next/link";
import { useParcours } from "../../../context/useParcours";
import { Step } from "../../../domain";

export default function CalloutFacturesEnInstruction() {
  const { getDossierUrl } = useParcours();

  const dsUrl = getDossierUrl(Step.FACTURES);

  return (
    <div className="fr-callout fr-callout--blue-cumulus fr-icon-time-line">
      <p className="fr-callout__title">Vos factures sont en instruction</p>
      <p className="fr-callout__text">
        Un instructeur examine les factures fournies. Vous serez informé ici et par e-mail dès que la décision sera
        prise.
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
