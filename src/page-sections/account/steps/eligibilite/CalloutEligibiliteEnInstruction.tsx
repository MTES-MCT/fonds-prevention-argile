"use client";

import { useParcours } from "@/lib/parcours/hooks/useParcours";
import { Step } from "@/lib/parcours/parcours.types";
import { formatDate } from "@/lib/utils";
import { addDays } from "@/lib/utils/date";
import Link from "next/link";

export default function CalloutEligibiliteEnInstruction() {
  const { dossiers, getDossierUrl } = useParcours();

  // Récupérer le dossier d'éligibilité
  const dossierEligilibilite = dossiers?.find(
    (d) => d.step === Step.ELIGIBILITE
  );

  const dossierUrl = getDossierUrl(Step.ELIGIBILITE);

  // Date de soumission du dossier
  const dossierSubmittedDate =
    dossierEligilibilite?.submittedAt?.toISOString() || null;

  // Date estimée de décision 5 jours après la soumission
  const dossierEstimatedDecisionDate = dossierSubmittedDate
    ? addDays(new Date(dossierSubmittedDate), 5).toISOString()
    : null;

  return (
    <div className="fr-callout fr-callout--blue-cumulus fr-icon-time-line">
      <p className="fr-callout__title">Votre dossier est en instruction</p>
      <p className="fr-callout__text">
        Un instructeur examine votre formulaire d'éligibilité. Vous serez
        informé ici et par e-mail dès que la décision sera prise.
        {dossierSubmittedDate && (
          <>
            {" "}
            Votre dossier a été déposé le{" "}
            <strong>{formatDate(dossierSubmittedDate)}</strong>.
            {dossierEstimatedDecisionDate && (
              <>
                {" "}
                Selon nos délais moyens constatés, vous devriez recevoir un avis
                d'ici le{" "}
                <strong>{formatDate(dossierEstimatedDecisionDate)}</strong>.
              </>
            )}
          </>
        )}
      </p>
      <ul className="fr-btns-group fr-btns-group--inline fr-btns-group--icon-right">
        <li>
          <Link
            href={dossierUrl || "#"}
            target="_blank"
            className="fr-btn fr-btn--secondary fr-btn--icon-right fr-icon-external-link-fill"
          >
            Voir mes réponses au formulaire
          </Link>
        </li>
        <li>
          <Link
            href={`${dossierUrl}/messagerie` || "#"}
            target="_blank"
            className="fr-btn fr-btn--secondary fr-btn--icon-right fr-icon-external-link-fill"
          >
            Aller sur ma messagerie
          </Link>
        </li>
      </ul>
    </div>
  );
}
