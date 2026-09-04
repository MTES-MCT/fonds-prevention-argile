/**
 * Silhouette de maison en coupe, réutilisée comme base par tous les schémas
 * `Schema*.tsx`. Trait simple, cohérent avec les couleurs DSFR (bleu France).
 * Pas de composant public : importé seulement par les fichiers de ce dossier.
 */
export function MaisonBase() {
  return (
    <>
      {/* Toit */}
      <polygon points="60,20 100,45 20,45" fill="none" stroke="#000091" strokeWidth="3" strokeLinejoin="round" />
      {/* Murs */}
      <rect x="25" y="45" width="70" height="45" fill="#F5F5FE" stroke="#000091" strokeWidth="3" />
      {/* Fondations (visibles, léger dépassement sous le sol) */}
      <rect x="25" y="90" width="70" height="8" fill="#929292" />
    </>
  );
}

export const SOL_Y = 98;
export const SVG_VIEWBOX = "0 0 200 140";
