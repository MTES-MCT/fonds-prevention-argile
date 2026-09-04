import { MaisonBase, SVG_VIEWBOX } from "./MaisonBase";

export function SchemaEnsoleillement() {
  const rayons = [-30, -10, 10, 30];
  return (
    <svg viewBox={SVG_VIEWBOX} width="200" height="140" role="img" aria-hidden="true">
      <MaisonBase />
      <line x1="0" y1="98" x2="200" y2="98" stroke="#3A3A3A" strokeWidth="2" />
      {/* Soleil et rayons frappant la façade */}
      <circle cx="165" cy="25" r="14" fill="#FFD166" stroke="#E4794A" strokeWidth="1.5" />
      {rayons.map((angle) => {
        const rad = (angle * Math.PI) / 180;
        const x2 = 165 + Math.sin(rad) * 22;
        const y2 = 25 + 22 - Math.cos(rad) * 8;
        return <line key={angle} x1="165" y1="25" x2={x2} y2={y2} stroke="#E4794A" strokeWidth="1.5" />;
      })}
      <path
        d="M150,35 Q120,55 100,70"
        fill="none"
        stroke="#E4794A"
        strokeWidth="2"
        strokeDasharray="3 2"
        markerEnd="url(#arrow-soleil)"
      />
      <defs>
        <marker id="arrow-soleil" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill="#E4794A" />
        </marker>
      </defs>
    </svg>
  );
}
