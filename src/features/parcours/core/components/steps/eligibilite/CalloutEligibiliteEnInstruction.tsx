"use client";

import Link from "next/link";
import { useParcours } from "../../../context/useParcours";
import { Step } from "../../../domain";
import { formatDate } from "@/shared/utils";
import { getDossierDsDemandeUrl, getDossierDsMessagerieUrl } from "@/features/parcours/dossiers-ds/utils";

export default function CalloutEligibiliteEnInstruction() {
  const { dossiers } = useParcours();

  // Récupérer le dossier d'éligibilité
  const dossierEligilibilite = dossiers?.find((d) => d.demarcheEtape === Step.ELIGIBILITE);

  // Date de soumission du dossier
  const dossierSubmittedDate = dossierEligilibilite?.createdAt?.toISOString() || null;

  // URLs de la demande dans Démarches Simplifiées
  const demandeDsUrl = getDossierDsDemandeUrl(dossierEligilibilite?.numeroDs);

  // URLs de la messagerie de la demande dans Démarches Simplifiées
  const messagerieDsUrl = getDossierDsMessagerieUrl(dossierEligilibilite?.numeroDs);

  return (
    <div className="fr-callout fr-callout--blue-cumulus fr-icon-time-line">
      <p className="fr-callout__title">Votre dossier est en instruction</p>
      <p className="fr-callout__text">
        Un instructeur examine votre formulaire d'éligibilité. Vous serez informé ici et par e-mail dès que la décision
        sera prise.
        {dossierSubmittedDate && (
          <>
            {" "}
            Votre dossier a été déposé le <strong>{formatDate(dossierSubmittedDate)}</strong>.
          </>
        )}
      </p>
      <ul className="fr-btns-group fr-btns-group--inline fr-btns-group--icon-right">
        <li>
          <Link
            href={demandeDsUrl}
            target="_blank"
            className="fr-btn fr-btn--secondary fr-btn--icon-right fr-icon-external-link-fill">
            Voir mes réponses au formulaire
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
