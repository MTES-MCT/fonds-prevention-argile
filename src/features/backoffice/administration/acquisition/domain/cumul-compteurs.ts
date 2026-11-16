import type { CompteurSimulations } from "./simulations-departement";

/**
 * Cumule les compteurs d'events renvoyés par plusieurs sous-périodes Matomo disjointes
 * (cf. `decouperPeriodeMatomo`) — additif, contrairement aux visiteurs uniques.
 */
export function cumulerCompteurs(compteursParAppel: Map<string, number>[]): Map<string, number> {
  const cumul = new Map<string, number>();
  for (const compteurs of compteursParAppel) {
    for (const [label, valeur] of compteurs) cumul.set(label, (cumul.get(label) ?? 0) + valeur);
  }
  return cumul;
}

/** Même cumul pour les rapports par dimension, qui portent éligibles et non éligibles par valeur. */
export function cumulerSimulations(parAppel: Map<string, CompteurSimulations>[]): Map<string, CompteurSimulations> {
  const cumul = new Map<string, CompteurSimulations>();
  for (const compteurs of parAppel) {
    for (const [valeur, compteur] of compteurs) {
      const actuel = cumul.get(valeur) ?? { total: 0, eligible: 0, nonEligible: 0 };
      cumul.set(valeur, {
        total: actuel.total + compteur.total,
        eligible: actuel.eligible + compteur.eligible,
        nonEligible: actuel.nonEligible + compteur.nonEligible,
      });
    }
  }
  return cumul;
}
