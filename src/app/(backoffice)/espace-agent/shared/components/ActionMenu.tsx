"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";

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
  const [position, setPosition] = useState<{ top: number; right: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Positionne le menu (porté dans document.body) sous le bouton, aligné à droite.
  // Le portail + position fixed évite que le menu soit coupé par l'overflow des
  // conteneurs DSFR (.fr-table__container { overflow: auto }).
  function updatePosition() {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) {
      return;
    }
    setPosition({ top: rect.bottom + 2, right: window.innerWidth - rect.right });
  }

  function toggle() {
    if (!isOpen) {
      updatePosition();
    }
    setIsOpen((open) => !open);
  }

  // Fermer le menu si clic a l'exterieur (bouton ou menu porté)
  // et recaler / fermer sur scroll et resize.
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (!buttonRef.current?.contains(target) && !menuRef.current?.contains(target)) {
        setIsOpen(false);
      }
    }

    function handleReposition() {
      updatePosition();
    }

    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("resize", handleReposition);
    // capture: true pour capter le scroll de n'importe quel conteneur parent
    window.addEventListener("scroll", handleReposition, true);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("resize", handleReposition);
      window.removeEventListener("scroll", handleReposition, true);
    };
  }, [isOpen]);

  return (
    <div style={{ display: "inline-block" }}>
      <button
        ref={buttonRef}
        className="fr-btn fr-btn--tertiary-no-outline fr-btn--sm"
        aria-label={ariaLabel}
        title={ariaLabel}
        onClick={toggle}
        type="button"
        style={{ padding: "0.25rem" }}>
        ⋯
      </button>

      {isOpen &&
        position &&
        createPortal(
          <div
            ref={menuRef}
            style={{
              position: "fixed",
              top: position.top,
              right: position.right,
              zIndex: 2000,
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
          </div>,
          document.body
        )}
    </div>
  );
}
