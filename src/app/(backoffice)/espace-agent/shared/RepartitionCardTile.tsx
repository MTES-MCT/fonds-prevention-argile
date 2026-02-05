"use client";

interface RepartitionCardTileProps {
  number: number;
  label: string;
  badgeSeverity?: string;
}

/**
 * Carte pour afficher une statistique de répartition
 * avec un nombre centré et un badge DSFR pour le label
 */
export function RepartitionCardTile({ number, label, badgeSeverity = "info" }: RepartitionCardTileProps) {
  return (
    <div
      className="fr-p-3w"
      style={{
        backgroundColor: "var(--background-default-grey)",
        textAlign: "center",
        border: "1px solid var(--border-default-grey)",
        boxShadow: "inset 0 -4px 0 0 black",
      }}>
      <p
        className="fr-mb-2w"
        style={{
          fontSize: "2.5rem",
          fontWeight: "700",
          lineHeight: "1.2",
          color: "var(--text-title-blue-france)",
        }}>
        {number.toLocaleString("fr-FR")}
      </p>
      <p className={`fr-badge ${badgeSeverity} fr-badge--no-icon`}>{label}</p>
    </div>
  );
}
