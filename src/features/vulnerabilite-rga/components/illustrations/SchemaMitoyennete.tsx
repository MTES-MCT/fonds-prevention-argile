import { MaisonBase, SVG_VIEWBOX } from "./MaisonBase";

export function SchemaMitoyennete() {
  return (
    <svg viewBox={SVG_VIEWBOX} width="200" height="140" role="img" aria-hidden="true">
      <MaisonBase />
      {/* Maison voisine mitoyenne, mur commun */}
      <polygon points="95,30 140,50 95,50" fill="none" stroke="#929292" strokeWidth="3" strokeLinejoin="round" />
      <rect x="95" y="50" width="45" height="40" fill="#F5F5FE" stroke="#929292" strokeWidth="3" />
      <rect x="95" y="90" width="45" height="8" fill="#929292" />
      {/* Mur mitoyen commun mis en évidence */}
      <line x1="95" y1="30" x2="95" y2="98" stroke="#000091" strokeWidth="3" strokeDasharray="4 3" />
      <line x1="0" y1="98" x2="200" y2="98" stroke="#3A3A3A" strokeWidth="2" />
    </svg>
  );
}
