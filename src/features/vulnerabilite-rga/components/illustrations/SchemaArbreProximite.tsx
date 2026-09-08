import { MaisonBase, SVG_VIEWBOX } from "./MaisonBase";

export function SchemaArbreProximite() {
  return (
    <svg viewBox={SVG_VIEWBOX} width="200" height="140" role="img" aria-hidden="true">
      <MaisonBase />
      <line x1="0" y1="98" x2="200" y2="98" stroke="#3A3A3A" strokeWidth="2" />
      {/* Arbre proche de la façade */}
      <line x1="130" y1="98" x2="130" y2="55" stroke="#5C4B36" strokeWidth="4" />
      <circle cx="130" cy="42" r="22" fill="#8ABF3F" stroke="#18753C" strokeWidth="2" />
      {/* Racines s'étendant sous les fondations */}
      <path
        d="M130,98 C115,105 100,102 95,96 M130,98 C118,110 105,112 98,108"
        fill="none"
        stroke="#5C4B36"
        strokeWidth="2"
        strokeDasharray="3 2"
      />
    </svg>
  );
}
