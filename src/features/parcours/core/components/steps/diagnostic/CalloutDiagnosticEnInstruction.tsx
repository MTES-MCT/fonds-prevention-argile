"use client";

import Link from "next/link";
import { useParcours } from "../../../context/useParcours";
import { Step } from "../../../domain";
import { formatDate } from "@/shared/utils";
import { getDossierDsDemandeUrl, getDossierDsMessagerieUrl } from "@/features/parcours/dossiers-ds/utils";

export default function CalloutDiagnosticEnInstruction() {
  const { dossiers } = useParcours();

  const dossierDiagnostic = dossiers?.find((d) => d.demarcheEtape === Step.DIAGNOSTIC);
  const dossierSubmittedDate = dossierDiagnostic?.createdAt?.toISOString() || null;
  const demandeDsUrl = getDossierDsDemandeUrl(dossierDiagnostic?.numeroDs);
  const messagerieDsUrl = getDossierDsMessagerieUrl(dossierDiagnostic?.numeroDs);

  return (
    <div className="fr-callout fr-callout--blue-cumulus fr-icon-time-line">
      <p className="fr-callout__title">Votre diagnostic est en instruction</p>
      <p className="fr-callout__text">
        Un instructeur examine votre diagnostic. Vous serez informé ici et par e-mail dès que la décision sera prise.
        {dossierSubmittedDate && (
          <>
            {" "}
            Votre diagnostic a été déposé le <strong>{formatDate(dossierSubmittedDate)}</strong>.
          </>
        )}
      </p>
      <ul className="fr-btns-group fr-btns-group--inline fr-btns-group--icon-right">
        <li>
          <Link
            href={demandeDsUrl}
            target="_blank"
            className="fr-btn fr-btn--secondary fr-btn--icon-right fr-icon-external-link-fill">
            Voir mon diagnostic
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
