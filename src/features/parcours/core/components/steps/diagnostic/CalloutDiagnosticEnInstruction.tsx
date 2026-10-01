"use client";

import Link from "next/link";
import { useParcours } from "../../../context/useParcours";
import { Step } from "../../../domain";
import { useFormulaireGereParAmo } from "../../../hooks/useFormulaireGereParAmo";
import { getDossierDsMessagerieUrl } from "@/features/parcours/dossiers-ds/utils";

export default function CalloutDiagnosticEnInstruction() {
  const { dossiers } = useParcours();

  const dossierDiagnostic = dossiers?.find((d) => d.demarcheEtape === Step.DIAGNOSTIC);
  // URL de la demande : on utilise demarcheUrl (qui priorise l'URL stockée avec
  // prefill_token retournée par DS, force le mode "usager" sur les comptes
  // multi-profils admin/instructeur/usager).
  const demandeDsUrl = dossierDiagnostic?.demarcheUrl ?? "#";
  const messagerieDsUrl = getDossierDsMessagerieUrl(dossierDiagnostic?.numeroDs);
  // Dossier déposé par l'AMO : il vit sur son compte DN, le demandeur ne peut pas l'ouvrir.
  const gereParAmo = useFormulaireGereParAmo(Step.DIAGNOSTIC);

  return (
    <div className="fr-callout fr-callout--blue-cumulus fr-icon-time-line">
      <p className="fr-callout__title">Votre dossier est en instruction</p>
      <p className="fr-callout__text">
        Un instructeur examine votre diagnostic logement pour savoir si vous pouvez passer à l&apos;étape des devis.{" "}
        {gereParAmo
          ? "Votre AMO, qui a transmis la demande, échange avec lui si besoin ; sa décision vous sera indiquée ici."
          : "Vous serez informé ici et par e-mail de son retour."}
      </p>
      {gereParAmo ? null : (
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
      )}
    </div>
  );
}
