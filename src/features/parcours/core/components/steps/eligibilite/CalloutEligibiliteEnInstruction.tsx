"use client";

import Link from "next/link";
import { useParcours } from "../../../context/useParcours";
import { Step } from "../../../domain";
import { getDossierDsMessagerieUrl } from "@/features/parcours/dossiers-ds/utils";

export default function CalloutEligibiliteEnInstruction() {
  const { dossiers } = useParcours();

  // Récupérer le dossier d'éligibilité
  const dossierEligilibilite = dossiers?.find((d) => d.demarcheEtape === Step.ELIGIBILITE);

  // URL de la demande : on utilise demarcheUrl (qui priorise l'URL stockée avec
  // prefill_token retournée par DS, force le mode "usager" sur les comptes
  // multi-profils admin/instructeur/usager).
  const demandeDsUrl = dossierEligilibilite?.demarcheUrl ?? "#";

  // URL de la messagerie : reconstruite (l'URL DS de prefill ne contient pas le path messagerie).
  const messagerieDsUrl = getDossierDsMessagerieUrl(dossierEligilibilite?.numeroDs);

  return (
    <div className="fr-callout fr-callout--blue-cumulus fr-icon-time-line">
      <p className="fr-callout__title">Votre dossier est en instruction</p>
      <p className="fr-callout__text">
        Un instructeur examine votre formulaire d&apos;éligibilité. Vous serez informé ici et par e-mail dès que la
        décision sera prise.
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
