import { MaisonBase, SVG_VIEWBOX } from "./MaisonBase";

export function SchemaPenteTerrain() {
  return (
    <svg viewBox={SVG_VIEWBOX} width="200" height="140" role="img" aria-hidden="true">
      <MaisonBase />
      {/* Terrain en pente descendant vers la façade */}
      <polyline points="200,60 95,98" fill="none" stroke="#3A3A3A" strokeWidth="3" />
      <polyline points="95,98 25,98" fill="none" stroke="#3A3A3A" strokeWidth="3" />
      {/* Flèche d'écoulement de l'eau vers le mur */}
      <path
        d="M150,75 Q120,90 100,95"
        fill="none"
        stroke="#0063CB"
        strokeWidth="2.5"
        strokeDasharray="4 3"
        markerEnd="url(#arrow-pente)"
      />
      <defs>
        <marker id="arrow-pente" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto">
          <path d="M0,0 L8,4 L0,8 Z" fill="#0063CB" />
        </marker>
      </defs>
    </svg>
  );
}
