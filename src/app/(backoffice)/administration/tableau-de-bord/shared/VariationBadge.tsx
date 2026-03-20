"use client";

interface VariationBadgeProps {
  variation: number | null;
  variationType?: "percent" | "points";
}

/**
 * Badge de variation avec couleur et flèche directionnelle.
 *
 * - Vert (hausse) : ↑ +15 %
 * - Rouge (baisse) : ↓ -2 %
 * - Gris (stable) : → 0 %
 */
export function VariationBadge({ variation, variationType = "percent" }: VariationBadgeProps) {
  if (variation === null) return null;

  const isPositive = variation > 0;
  const isNegative = variation < 0;
  const isNeutral = variation === 0;

  const arrow = isPositive ? "\u2191" : isNegative ? "\u2193" : "\u2192";
  const suffix = variationType === "points" ? " PTS" : " %";
  const sign = isPositive ? "+" : "";
  const text = `${arrow} ${sign}${variation}${suffix}`;

  let bgColor = "var(--background-contrast-grey)";
  let textColor = "var(--text-default-grey)";

  if (isPositive) {
    bgColor = "var(--background-contrast-success)";
    textColor = "var(--text-default-success)";
  } else if (isNegative) {
    bgColor = "var(--background-contrast-error)";
    textColor = "var(--text-default-error)";
  }

  return (
    <span
      style={{
        display: "inline-block",
        padding: "0.125rem 0.5rem",
        borderRadius: "0.25rem",
        fontSize: "0.75rem",
        fontWeight: 700,
        backgroundColor: bgColor,
        color: textColor,
      }}
      aria-label={isNeutral ? "Stable" : `${isPositive ? "Hausse" : "Baisse"} de ${Math.abs(variation)}${suffix}`}>
      {text}
    </span>
  );
}
