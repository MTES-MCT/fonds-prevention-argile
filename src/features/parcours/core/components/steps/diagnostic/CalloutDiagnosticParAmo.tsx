"use client";

import { useParcours } from "../../../context/useParcours";
import { Step } from "../../../domain";
import { DossierTimeline } from "@/features/parcours/dossiers-ds/components/DossierTimeline";

/**
 * Étape diagnostic d'un dossier suivi par une AMO mandataire financier : c'est elle qui crée
 * et dépose la demande de paiement. Le demandeur n'a aucun formulaire à ouvrir.
 */
export default function CalloutDiagnosticParAmo() {
  const { validationAmoComplete, getDossierByStep } = useParcours();

  const amo = validationAmoComplete?.entrepriseAmo ?? null;
  const dossier = getDossierByStep(Step.DIAGNOSTIC);
  const email = amo?.emails.split(";")[0]?.trim();

  return (
    <div className="fr-callout fr-callout--yellow-moutarde fr-icon-info-line">
      <p className="fr-callout__title">
        Logement éligible ! Votre AMO s&apos;occupe de la demande de paiement du diagnostic.
      </p>
      <p className="fr-callout__text">
        Votre dossier est bien éligible et votre diagnostic logement peut être effectué. {amo?.nom ?? "Votre AMO"} étant
        votre mandataire financier, l&apos;aide lui est versée directement : c&apos;est donc votre AMO qui transmet le
        rapport de diagnostic et la demande de paiement à l&apos;administration. Vous n&apos;avez pas de formulaire à
        remplir pour cette étape.
      </p>
      <p className="fr-callout__text">
        {dossier
          ? "Votre AMO a commencé cette démarche. Vous serez informé ici de son avancement."
          : "Contactez votre AMO pour organiser la réalisation du diagnostic."}
      </p>

      {amo && (
        <p className="fr-text--sm fr-mb-0">
          <strong>{amo.nom}</strong>
          {email && (
            <>
              {" — "}
              <a href={`mailto:${email}`}>{email}</a>
            </>
          )}
          {amo.telephone && (
            <>
              {" — "}
              <a href={`tel:${amo.telephone}`}>{amo.telephone}</a>
            </>
          )}
        </p>
      )}

      {dossier && (
        <div className="fr-mt-2w text-(--text-mention-grey)">
          <DossierTimeline dossier={dossier} />
        </div>
      )}
    </div>
  );
}
