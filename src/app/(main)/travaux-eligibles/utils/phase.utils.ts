import contentCommon from "../content/common.json";

export type Phase = "etude" | "travaux";

/** Libellé court pour un badge (ex: "Étude", "Travaux"). */
export function phaseLabel(phase: Phase | string): string {
  return phase === "etude" ? "Étude" : "Travaux";
}

/** Classe DSFR de couleur pour le badge phase. */
export function phaseBadgeClassName(phase: Phase | string): string {
  return phase === "etude" ? "fr-badge--blue-ecume" : "fr-badge--yellow-tournesol";
}

/** Description longue pour le callout de la page dédiée. */
export function phaseDescription(phase: Phase | string): string {
  return `Le dispositif d'aides aux ménages est découpé en deux phases : La phase étude (qui comprend la réalisation du diagnostic de vulnérabilité), et la phase travaux (qui comprend la réalisation des travaux de prévention). Cette prestation relève de la phase ${phase}.`;
}

/**
 * Recherche la phase d'une prestation à partir de son `pageUrl` (ex: "/travaux-eligibles/reperage-fuite-reseaux-eaux").
 * Source unique : common.json. Retourne `undefined` si non trouvée.
 */
export function findPhaseByPageUrl(pageUrl: string): Phase | undefined {
  for (const tab of contentCommon.autres_travaux_section.travaux_tabs) {
    const match = tab.travaux.find((t) => t.pageUrl === pageUrl);
    if (match && (match.phase === "etude" || match.phase === "travaux")) {
      return match.phase;
    }
  }
  return undefined;
}
