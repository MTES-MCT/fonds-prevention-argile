"use client";

interface StatCardProps {
  number: string;
  label: string;
  icon?: string;
  description?: string;
  className?: string;
}

export default function StatCard({
  number,
  label,
  icon,
  description,
  className = "fr-col-12 fr-col-md-3",
}: StatCardProps) {
  return (
    <div className={className} style={{ display: "flex" }}>
      <div
        style={{
          textAlign: "center",
          padding: "1.5rem 1rem",
          backgroundColor: "var(--background-default-grey)",
          border: "1px solid var(--border-default-grey)",
          borderBottom: "3px solid var(--border-plain-grey)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
        }}>
        {icon && (
          <span
            className={icon}
            aria-hidden="true"
            style={{
              fontSize: "1.25rem",
              color: "var(--text-label-blue-france)",
              display: "block",
              marginBottom: "0.75rem",
            }}
          />
        )}
        <p
          style={{
            fontSize: "2.5rem",
            fontWeight: "700",
            lineHeight: "1",
            color: "var(--text-title-blue-france)",
            marginBottom: "0.5rem",
          }}>
          {number}
        </p>
        <p
          className="fr-text--lg"
          style={{
            color: "var(--text-default-grey)",
            fontWeight: "500",
            marginBottom: description ? "0.25rem" : "0",
          }}>
          {label}
        </p>
        {description && (
          <p
            className="fr-text--sm"
            style={{
              color: "var(--text-mention-grey)",
              marginBottom: "0",
            }}>
            {description}
          </p>
        )}
      </div>
    </div>
  );
}
