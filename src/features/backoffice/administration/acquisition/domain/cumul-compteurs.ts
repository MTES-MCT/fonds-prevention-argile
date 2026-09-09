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
