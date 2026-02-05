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
    <div
      className="fr-p-3w"
      style={{
        backgroundColor: "var(--background-default-grey)",
        border: "1px solid var(--border-default-grey)",
        boxShadow: "inset 0 -4px 0 0 black",
        height: "100%",
      }}>
      <p
        className="fr-mb-1w"
        style={{
          fontSize: "3rem",
          fontWeight: "700",
          lineHeight: "1.2",
        }}>
        {number}
      </p>
      <p className="fr-text-mention--grey fr-mb-1v">{label}</p>
      {description ? (
        <p className="fr-text-mention--grey fr-text--sm fr-mb-0">{description}</p>
      ) : (
        <p className="fr-mb-0">&nbsp;</p>
      )}
    </div>
  );
}
