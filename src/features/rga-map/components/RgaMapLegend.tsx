import { ALEA_COLORS } from "../domain/config";

interface RgaMapLegendProps {
  className?: string;
}

const LEGEND_ITEMS = [
  { level: "Fort", color: ALEA_COLORS.fort, description: "Aléa fort" },
  { level: "Moyen", color: ALEA_COLORS.moyen, description: "Aléa moyen" },
  { level: "Faible", color: ALEA_COLORS.faible, description: "Aléa faible" },
] as const;

export function RgaMapLegend({ className = "" }: RgaMapLegendProps) {
  return (
    <div className={`fr-p-2w fr-background-default--grey ${className}`}>
      <p className="fr-text--sm fr-text--bold fr-mb-1w">Niveau d'aléa retrait-gonflement</p>
      <ul className="fr-raw-list">
        {LEGEND_ITEMS.map(({ level, color, description }) => (
          <li key={level} className="fr-mb-1v">
            <span
              style={{
                display: "inline-block",
                width: "16px",
                height: "16px",
                backgroundColor: color,
                border: "1px solid #000",
                marginRight: "8px",
                verticalAlign: "middle",
              }}
              aria-hidden="true"
            />
            <span className="fr-text--sm">{description}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
