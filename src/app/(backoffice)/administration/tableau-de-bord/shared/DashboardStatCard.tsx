"use client";

interface DashboardStatCardProps {
  value: string;
  label: string;
  variation: number | null;
  variationType?: "percent" | "points";
  loading?: boolean;
  compact?: boolean;
  /** Classe CSS du conteneur externe (defaut: "fr-col-12 fr-col-md-6 fr-col-lg-3") */
  className?: string;
}

function VariationBadge({
  variation,
  variationType = "percent",
}: {
  variation: number | null;
  variationType: "percent" | "points";
}) {
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
        marginBottom: "0.75rem",
      }}
      aria-label={isNeutral ? "Stable" : `${isPositive ? "Hausse" : "Baisse"} de ${Math.abs(variation)}${suffix}`}>
      {text}
    </span>
  );
}

export function DashboardStatCard({
  value,
  label,
  variation,
  variationType = "percent",
  loading = false,
  compact = false,
  className = "fr-col-12 fr-col-md-6 fr-col-lg-3",
}: DashboardStatCardProps) {
  return (
    <div className={className} style={{ display: "flex" }}>
      <div
        className={compact ? "fr-p-2w" : "fr-p-3w"}
        style={{
          backgroundColor: "var(--background-default-grey)",
          border: "1px solid var(--border-default-grey)",
          boxShadow: "inset 0 -4px 0 0 black",
          width: "100%",
          height: "100%",
        }}>
        <VariationBadge variation={variation} variationType={variationType} />
        <p
          className="fr-mb-1w"
          style={{
            fontSize: compact ? "2rem" : "3rem",
            fontWeight: 700,
            lineHeight: 1.2,
          }}>
          {loading ? "..." : value}
        </p>
        <p className={`fr-text-mention--grey fr-mb-0 ${compact ? "fr-text--sm" : ""}`}>{label}</p>
      </div>
    </div>
  );
}
