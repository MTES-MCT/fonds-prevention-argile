"use client";

import { useState, useRef, useEffect } from "react";

interface ActionMenuItem {
  label: string;
  onClick: () => void;
  variant?: "default" | "danger";
  disabled?: boolean;
  /** Classe d'icône DSFR (ex: "fr-icon-eye-line") affichée avant le label */
  icon?: string;
}

interface ActionMenuProps {
  items: ActionMenuItem[];
  ariaLabel?: string;
}

/**
 * Menu d'actions generique (bouton "..." + dropdown)
 * Reutilisable dans tout le backoffice
 */
export function ActionMenu({ items, ariaLabel = "Actions" }: ActionMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Fermer le menu si clic a l'exterieur
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  return (
    <div ref={menuRef} style={{ position: "relative", display: "inline-block" }}>
      <button
        className="fr-btn fr-btn--tertiary-no-outline fr-btn--sm"
        aria-label={ariaLabel}
        title={ariaLabel}
        onClick={() => setIsOpen(!isOpen)}
        type="button"
        style={{ padding: "0.25rem" }}>
        ⋯
      </button>

      {isOpen && (
        <div
          style={{
            position: "absolute",
            right: 0,
            top: "100%",
            marginTop: "0.125rem",
            zIndex: 1000,
            backgroundColor: "white",
            border: "1px solid var(--border-default-grey)",
            borderRadius: "4px",
            boxShadow: "0 2px 6px rgba(0,0,0,0.12)",
            overflow: "hidden",
          }}>
          {items.map((item, index) => (
            <div key={item.label}>
              {index > 0 && <div style={{ borderTop: "1px solid var(--border-default-grey)" }} />}
              <button
                onClick={() => {
                  item.onClick();
                  setIsOpen(false);
                }}
                disabled={item.disabled}
                type="button"
                className="fr-text--sm fr-mb-0"
                style={{
                  width: "100%",
                  textAlign: "left",
                  padding: "0.375rem 0.75rem",
                  border: "none",
                  backgroundColor: "transparent",
                  cursor: item.disabled ? "not-allowed" : "pointer",
                  color: item.variant === "danger" ? "#ce0500" : "var(--text-action-high-blue-france)",
                  whiteSpace: "nowrap",
                  opacity: item.disabled ? 0.5 : 1,
                  display: "flex",
                  alignItems: "center",
                  gap: "0.375rem",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#f6f6f6")}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}>
                {item.icon && <span className={`${item.icon} fr-icon--sm`} aria-hidden="true" />}
                {item.label}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
