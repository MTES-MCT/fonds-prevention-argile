"use client";

interface StepperStatsItem {
  label: string;
  value: string;
  suffix?: string;
  fillPercent: number;
  color: string;
}

interface StepperStatsProps {
  items: StepperStatsItem[];
}

export function StepperStats({ items }: StepperStatsProps) {
  return (
    <div>
      {/* Barre segmentee type stepper — remplissage horizontal */}
      <div style={{ display: "flex", gap: "4px", height: 8, marginBottom: "1rem" }}>
        {items.map((item, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              backgroundColor: "var(--background-contrast-grey)",
              borderRadius: i === 0 ? "4px 0 0 4px" : i === items.length - 1 ? "0 4px 4px 0" : 0,
              overflow: "hidden",
            }}>
            <div
              style={{
                height: "100%",
                width: `${Math.max(item.fillPercent, 5)}%`,
                backgroundColor: item.color,
                borderRadius: "inherit",
                transition: "width 0.3s ease",
              }}
            />
          </div>
        ))}
      </div>

      {/* Labels et valeurs sous chaque segment */}
      <div style={{ display: "flex", gap: "4px" }}>
        {items.map((item, i) => (
          <div key={i} style={{ flex: 1, textAlign: "center" }}>
            <p className="fr-mb-0" style={{ fontSize: "1.5rem", fontWeight: 700, lineHeight: 1.2 }}>
              {item.value}
              {item.suffix && <span style={{ fontSize: "0.75rem", fontWeight: 400 }}>{item.suffix}</span>}
            </p>
            <p className="fr-text--xs fr-text-mention--grey fr-mb-0">{item.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
