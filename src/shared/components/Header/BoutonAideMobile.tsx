"use client";

import { LIEN_AIDE_SIMULATEUR } from "@/shared/constants/aide.constants";

/** Bouton et non lien : dans la marque, tout lien hérite du ::before de fr-enlarge-link. */
export function BoutonAideMobile() {
  return (
    <button
      type="button"
      title="Besoin d'aide ?"
      className="fr-btn fr-icon-question-fill"
      onClick={() => {
        window.location.href = LIEN_AIDE_SIMULATEUR;
      }}>
      Besoin d&apos;aide ?
    </button>
  );
}
