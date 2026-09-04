import { MaisonBase, SVG_VIEWBOX } from "./MaisonBase";

export function SchemaGouttieres() {
  return (
    <svg viewBox={SVG_VIEWBOX} width="200" height="140" role="img" aria-hidden="true">
      <MaisonBase />
      <line x1="0" y1="98" x2="200" y2="98" stroke="#3A3A3A" strokeWidth="2" />
      {/* Gouttière le long du toit */}
      <line x1="18" y1="46" x2="102" y2="46" stroke="#929292" strokeWidth="3" />
      {/* Descente d'eau collée au mur, débordement au sol contre la façade */}
      <line x1="98" y1="46" x2="98" y2="94" stroke="#929292" strokeWidth="3" />
      <path d="M98,90 Q92,96 88,98" fill="none" stroke="#0063CB" strokeWidth="2.5" markerEnd="url(#arrow-gouttiere)" />
      <circle cx="90" cy="95" r="2" fill="#0063CB" opacity="0.6" />
      <defs>
        <marker id="arrow-gouttiere" markerWidth="7" markerHeight="7" refX="3.5" refY="3.5" orient="auto">
          <path d="M0,0 L7,3.5 L0,7 Z" fill="#0063CB" />
        </marker>
      </defs>
    </svg>
  );
}
