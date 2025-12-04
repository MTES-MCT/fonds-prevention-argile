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
    <div className={className}>
      <div
        className="fr-tile"
        style={{
          textAlign: "center",
        }}>
        <div className="fr-tile__body">
          <div className="fr-tile__content">
            <h3
              className="fr-tile__title"
              style={{
                fontSize: "2.5rem",
                fontWeight: "700",
                lineHeight: "1",
                color: "var(--text-title-blue-france)",
                marginBottom: "0.5rem",
              }}>
              {number}
            </h3>
            <p
              className="fr-tile__detail fr-text--lg"
              style={{
                color: "var(--text-mention-grey)",
                fontWeight: "500",
                marginBottom: description ? "0.5rem" : "0",
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
        {icon && (
          <div className="fr-tile__header">
            <div className="fr-tile__pictogram">
              <span
                className={icon}
                aria-hidden="true"
                style={{
                  fontSize: "1rem",
                  color: "var(--text-label-blue-france)",
                }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
