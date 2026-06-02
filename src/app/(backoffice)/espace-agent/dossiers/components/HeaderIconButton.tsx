"use client";

import type { ButtonHTMLAttributes } from "react";

interface HeaderIconButtonProps extends Pick<ButtonHTMLAttributes<HTMLButtonElement>, "onClick" | "title"> {
  /** Classe DSFR de l'icône (ex. `fr-icon-filter-line`, `fr-icon-arrow-up-line`). */
  icon: string;
  /** Libellé accessible. */
  ariaLabel: string;
  /** Affiche un petit point indicateur en haut-droit (filtre actif, tri actif…). */
  active?: boolean;
  ariaExpanded?: boolean;
  ariaControls?: string;
}

/**
 * Petit bouton icône utilisé dans les en-têtes de tableau (tri, filtre…).
 * Mutualise la présentation (taille, padding, indicateur d'activité).
 */
export function HeaderIconButton({
  icon,
  ariaLabel,
  active = false,
  ariaExpanded,
  ariaControls,
  onClick,
  title,
}: HeaderIconButtonProps) {
  return (
    <button
      type="button"
      className={`fr-btn fr-btn--tertiary fr-btn--sm ${icon}`}
      aria-label={ariaLabel}
      aria-expanded={ariaExpanded}
      aria-controls={ariaControls}
      onClick={onClick}
      title={title}
      style={{ padding: "0.25rem 0.4rem", position: "relative", minHeight: 0 }}>
      {active && (
        <span
          aria-hidden="true"
          style={{
            position: "absolute",
            top: 2,
            right: 2,
            width: 6,
            height: 6,
            borderRadius: "50%",
            backgroundColor: "var(--background-action-high-blue-france)",
          }}
        />
      )}
    </button>
  );
}
