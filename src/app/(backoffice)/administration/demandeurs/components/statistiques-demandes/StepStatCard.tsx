"use client";

interface StepStatCardProps {
  value: string;
  label: string;
  /** Pourcentage de remplissage de la barre (0-100) */
  fillPercent: number;
  /** Couleur de la barre */
  barColor?: string;
  suffix?: string;
}

export function StepStatCard({
  value,
  label,
  fillPercent,
  barColor = "var(--background-flat-info)",
  suffix,
}: StepStatCardProps) {
  return (
    <div
      style={{
        minWidth: 0,
        flex: 1,
      }}>
      {/* Barre de progression */}
      <div
        style={{
          height: 6,
          borderRadius: 3,
          backgroundColor: "var(--background-contrast-grey)",
          marginBottom: "0.75rem",
          overflow: "hidden",
        }}>
        <div
          style={{
            height: "100%",
            width: `${Math.min(fillPercent, 100)}%`,
            borderRadius: 3,
            backgroundColor: barColor,
            transition: "width 0.3s ease",
          }}
        />
      </div>

      {/* Valeur */}
      <p className="fr-mb-0" style={{ fontSize: "1.75rem", fontWeight: 700, lineHeight: 1.2 }}>
        {value}
        {suffix && <span style={{ fontSize: "0.875rem", fontWeight: 400 }}>{suffix}</span>}
      </p>

      {/* Label */}
      <p className="fr-text--sm fr-text-mention--grey fr-mb-0">{label}</p>
    </div>
  );
}
