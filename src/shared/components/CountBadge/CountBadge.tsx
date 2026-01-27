interface CountBadgeProps {
  count: number;
  backgroundColor?: string;
  color?: string;
}

/**
 * Badge affichant un compteur
 *
 * Utilisé pour afficher des notifications ou des compteurs dans la navigation
 */
export function CountBadge({ count, backgroundColor = "#FEECC2", color = "#716043" }: CountBadgeProps) {
  if (count <= 0) {
    return null;
  }

  return (
    <span
      className="fr-ml-1w"
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor,
        color,
        borderRadius: "6px",
        padding: "0 0.5rem",
        fontSize: "0.85rem",
        fontWeight: "700",
        minWidth: "1.25rem",
        height: "1.5rem",
      }}>
      {count}
    </span>
  );
}
