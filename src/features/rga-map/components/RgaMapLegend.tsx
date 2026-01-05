import { ALEA_COLORS } from "../domain/config";

const LEGEND_ITEMS = [
  { level: "FORT", color: ALEA_COLORS.fort },
  { level: "MOYEN", color: ALEA_COLORS.moyen },
  { level: "FAIBLE", color: ALEA_COLORS.faible },
] as const;

export function RgaMapLegend() {
  return (
    <div className="flex items-center justify-start space-x-1.5">
      <span className="text-xs fr-text--bold">Risque argile :</span>
      {LEGEND_ITEMS.map(({ level, color }) => (
        <span
          key={level}
          className="text-xs fr-text--bold p-1 rounded"
          style={{ backgroundColor: color, color: "#2a2a2a" }}>
          {level}
        </span>
      ))}
    </div>
  );
}
