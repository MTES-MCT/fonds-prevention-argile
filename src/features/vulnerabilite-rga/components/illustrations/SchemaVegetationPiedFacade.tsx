import { MaisonBase, SVG_VIEWBOX } from "./MaisonBase";

export function SchemaVegetationPiedFacade() {
  return (
    <svg viewBox={SVG_VIEWBOX} width="200" height="140" role="img" aria-hidden="true">
      <MaisonBase />
      <line x1="0" y1="98" x2="200" y2="98" stroke="#3A3A3A" strokeWidth="2" />
      {/* Rosier/potager collé au mur */}
      <rect x="30" y="90" width="18" height="8" fill="#8D5A2B" />
      <circle cx="34" cy="86" r="6" fill="#8ABF3F" stroke="#18753C" strokeWidth="1.5" />
      <circle cx="44" cy="84" r="7" fill="#8ABF3F" stroke="#18753C" strokeWidth="1.5" />
      <circle cx="40" cy="78" r="5" fill="#E4794A" />
      {/* Arrosage régulier juste au pied du mur */}
      <path d="M40,68 L38,80" stroke="#0063CB" strokeWidth="2" strokeDasharray="2 2" markerEnd="url(#arrow-veg)" />
      <defs>
        <marker id="arrow-veg" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill="#0063CB" />
        </marker>
      </defs>
    </svg>
  );
}
