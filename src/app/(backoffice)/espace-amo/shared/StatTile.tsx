/**
 * Tuile statistique pour afficher un indicateur clé
 */
interface StatTileProps {
  number: string;
  label: string;
  description?: string;
}

export function StatTile({ number, label, description }: StatTileProps) {
  return (
    <div className="fr-tile fr-tile--horizontal" style={{ paddingBottom: 0 }}>
      <div className="fr-tile__body" style={{ paddingBottom: 0 }}>
        <div className="fr-tile__content" style={{ alignItems: "flex-start" }}>
          <h3
            className="fr-tile__title"
            style={{
              fontSize: "3rem",
              fontWeight: "700",
              lineHeight: "1.2",
              textAlign: "left",
            }}>
            {number}
          </h3>
          <p
            className="fr-tile__desc fr-text-mention--grey"
            style={{ color: "var(--text-mention-grey)", textAlign: "left", width: "100%", marginBottom: 0 }}>
            {label}
          </p>
          {description && <p className="fr-tile__detail">{description}</p>}
        </div>
      </div>
    </div>
  );
}
