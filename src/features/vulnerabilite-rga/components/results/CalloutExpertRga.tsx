"use client";

import Link from "next/link";
import { useMatomo } from "@/shared/components/Matomo/useMatomo";
import { MATOMO_EVENTS } from "@/shared/constants";
import { CALLOUT_EXPERT_TITLE, getCalloutExpertTexte } from "../../domain/value-objects/resultat-content.const";
import { useVulnerabiliteContext } from "../shared/VulnerabiliteContext";

interface CalloutExpertRgaProps {
  /** Le renvoi vers le simulateur d'éligibilité et la promesse de financement n'ont de sens que si le logement peut y prétendre. */
  eligibleFonds: boolean;
}

/**
 * Avertissement affiché avant la liste de recommandations : ce simulateur donne des
 * pistes indicatives, pas un diagnostic. Toujours affiché, quel que soit le résultat.
 * Texte partagé avec le PDF téléchargeable (`resultat-content.const.ts`).
 */
export function CalloutExpertRga({ eligibleFonds }: CalloutExpertRgaProps) {
  const { trackEvent } = useMatomo();
  const { agent, urlEligibilite = "/simulateur" } = useVulnerabiliteContext();

  return (
    <div className="fr-callout fr-icon-info-line fr-callout--blue-ecume fr-my-4w">
      <p className="fr-callout__title">{CALLOUT_EXPERT_TITLE}</p>
      <p className="fr-callout__text whitespace-pre-line">{getCalloutExpertTexte(eligibleFonds)}</p>
      {eligibleFonds && (
        <Link
          href={urlEligibilite}
          className="fr-btn fr-btn--secondary fr-mt-2w"
          // Pas de trace pour l'agent : il n'est pas le visiteur du simulateur.
          onClick={() => !agent && trackEvent(MATOMO_EVENTS.VULNERABILITE_CTA_ELIGIBILITE)}>
          Vérifier mon éligibilité au Fonds Prévention Argile
        </Link>
      )}
    </div>
  );
}
