import { MaisonBase, SVG_VIEWBOX } from "./MaisonBase";

export function SchemaReseauxEnterres() {
  return (
    <svg viewBox={SVG_VIEWBOX} width="200" height="140" role="img" aria-hidden="true">
      <MaisonBase />
      {/* Ligne de sol */}
      <line x1="0" y1="98" x2="200" y2="98" stroke="#3A3A3A" strokeWidth="2" />
      {/* Canalisation enterrée passant sous les fondations */}
      <path
        d="M10,115 C40,115 40,100 60,100 C80,100 80,115 110,115 C140,115 140,100 190,100"
        fill="none"
        stroke="#0063CB"
        strokeWidth="4"
        strokeLinecap="round"
      />
      {/* Fuite au niveau des fondations */}
      <circle cx="70" cy="102" r="3" fill="#0063CB" />
      <circle cx="75" cy="108" r="2" fill="#0063CB" opacity="0.6" />
    </svg>
  );
}
