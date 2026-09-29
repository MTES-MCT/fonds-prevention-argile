"use client";

import { LIEN_AIDE_SIMULATEUR } from "@/shared/constants/aide.constants";
import { useSimulateurContext } from "../shared/SimulateurContext";

/** Seulement en iframe : ailleurs, le header du tunnel porte déjà ce lien. */
export function LienAideResultat() {
  const { showHelpLink } = useSimulateurContext();
  if (!showHelpLink) return null;

  return (
    <div className="flex justify-end fr-mb-2w px-4 pt-4 md:px-0 md:pt-0">
      <a id="link-help" href={LIEN_AIDE_SIMULATEUR} className="fr-link fr-icon-question-fill fr-link--icon-left">
        Besoin d&apos;aide ?
      </a>
    </div>
  );
}
