"use client";

import Link from "next/link";
import { useParcours } from "../../../context/useParcours";
import { Step } from "../../../domain";

export default function CalloutFacturesTodo() {
  const { getDossierUrl } = useParcours();

  const dsUrl = getDossierUrl(Step.FACTURES);

  return (
    <div className="fr-callout fr-callout--yellow-moutarde fr-icon-checkbox-circle-line">
      <p className="fr-callout__title">
        Vos devis ont été validés ! Vous pouvez procéder aux travaux et transmettre les factures.
      </p>
      <p className="fr-callout__text">
        L&apos;instructeur a approuvé vos devis, vous pouvez donc procéder à la réalisation des travaux avec les
        entreprises concernées. Une fois les travaux terminés, n&apos;oubliez pas de transmettre les factures à
        l&apos;instructeur afin qu&apos;il les examine et procède au paiement.
      </p>
      {dsUrl && (
        <Link
          href={dsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="fr-btn fr-btn--icon-right fr-icon-external-link-line">
          Transmettre les factures des travaux
        </Link>
      )}
    </div>
  );
}
