import { MaisonBase, SVG_VIEWBOX } from "./MaisonBase";

export function SchemaHaies() {
  const buissons = [108, 122, 136, 150];
  return (
    <svg viewBox={SVG_VIEWBOX} width="200" height="140" role="img" aria-hidden="true">
      <MaisonBase />
      <line x1="0" y1="98" x2="200" y2="98" stroke="#3A3A3A" strokeWidth="2" />
      {/* Haie dense proche du mur */}
      {buissons.map((cx) => (
        <circle key={cx} cx={cx} cy="88" r="12" fill="#8ABF3F" stroke="#18753C" strokeWidth="1.5" />
      ))}
    </svg>
  );
}
