"use client";

import { HeaderIconButton } from "./HeaderIconButton";

interface ColumnSortButtonProps {
  order: "asc" | "desc";
  onToggle: () => void;
  /** Libellé du critère trié (ex. « création »), utilisé pour l'aria-label. */
  criterion: string;
}

/**
 * Petit bouton de tri (↑/↓) à placer à côté d'un libellé d'en-tête de colonne.
 */
export function ColumnSortButton({ order, onToggle, criterion }: ColumnSortButtonProps) {
  return (
    <HeaderIconButton
      icon={order === "asc" ? "fr-icon-arrow-up-line" : "fr-icon-arrow-down-line"}
      ariaLabel={`Trier par ${criterion} (${order === "asc" ? "ascendant" : "descendant"})`}
      title={order === "asc" ? "Tri ascendant" : "Tri descendant"}
      onClick={onToggle}
    />
  );
}
