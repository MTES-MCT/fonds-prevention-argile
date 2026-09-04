import { MaisonBase, SVG_VIEWBOX } from "./MaisonBase";

export function SchemaGravierProprete() {
  const cailloux = Array.from({ length: 12 }, (_, i) => ({
    cx: 25 + i * 4 + (i % 2 === 0 ? 1 : -1),
    cy: 95 + (i % 3),
  }));

  return (
    <svg viewBox={SVG_VIEWBOX} width="200" height="140" role="img" aria-hidden="true">
      <MaisonBase />
      <line x1="0" y1="98" x2="200" y2="98" stroke="#3A3A3A" strokeWidth="2" />
      {/* Bande de gravier en pied de façade */}
      {cailloux.map((c, i) => (
        <circle key={i} cx={c.cx} cy={c.cy} r="1.8" fill="#929292" />
      ))}
      {/* Infiltration d'eau vers les fondations */}
      <path
        d="M35,80 L33,95 M45,75 L42,95"
        stroke="#0063CB"
        strokeWidth="2"
        strokeDasharray="3 2"
        markerEnd="url(#arrow-gravier)"
      />
      <defs>
        <marker id="arrow-gravier" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill="#0063CB" />
        </marker>
      </defs>
    </svg>
  );
}
