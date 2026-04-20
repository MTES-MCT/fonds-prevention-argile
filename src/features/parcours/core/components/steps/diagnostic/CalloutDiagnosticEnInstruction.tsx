"use client";

import Link from "next/link";
import { useParcours } from "../../../context/useParcours";
import { Step } from "../../../domain";
import { getDossierDsDemandeUrl, getDossierDsMessagerieUrl } from "@/features/parcours/dossiers-ds/utils";

export default function CalloutDiagnosticEnInstruction() {
  const { dossiers } = useParcours();

  const dossierDiagnostic = dossiers?.find((d) => d.demarcheEtape === Step.DIAGNOSTIC);
  const demandeDsUrl = getDossierDsDemandeUrl(dossierDiagnostic?.numeroDs);
  const messagerieDsUrl = getDossierDsMessagerieUrl(dossierDiagnostic?.numeroDs);

  return (
    <div className="fr-callout fr-callout--blue-cumulus fr-icon-time-line">
      <p className="fr-callout__title">Votre dossier est en instruction</p>
      <p className="fr-callout__text">
        Un instructeur examine votre diagnostic logement pour savoir si vous pouvez passer à l&apos;étape des devis. Vous
        serez informé ici et par e-mail de son retour.
      </p>
      <ul className="fr-btns-group fr-btns-group--inline fr-btns-group--icon-right">
        <li>
          <Link
            href={demandeDsUrl}
            target="_blank"
            className="fr-btn fr-btn--secondary fr-btn--icon-right fr-icon-external-link-fill">
            Voir mes réponses
          </Link>
        </li>
        <li>
          <Link
            href={messagerieDsUrl}
            target="_blank"
            className="fr-btn fr-btn--secondary fr-btn--icon-right fr-icon-external-link-fill">
            Aller sur ma messagerie
          </Link>
        </li>
      </ul>
    </div>
  );
}
