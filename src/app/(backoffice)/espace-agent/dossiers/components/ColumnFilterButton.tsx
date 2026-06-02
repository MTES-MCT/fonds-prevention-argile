"use client";

import { useEffect, useId, useRef, useState } from "react";
import { HeaderIconButton } from "./HeaderIconButton";

export interface FilterOption {
  value: string;
  label: string;
}

interface ColumnFilterButtonProps {
  /** Libellé accessible du filtre (ex. "Filtrer par étape"). */
  ariaLabel: string;
  /** Options proposées dans le popover. */
  options: FilterOption[];
  /** Valeurs cochées (multi-sélection). */
  selected: Set<string>;
  /** Notifie la nouvelle sélection (live, à chaque cochage). */
  onChange: (next: Set<string>) => void;
}

/**
 * Petit bouton entonnoir affiché dans un en-tête de colonne.
 * Ouvre un popover multi-sélection (cases à cocher). Filtre live :
 * chaque cochage déclenche immédiatement `onChange`. Click hors du
 * popover → fermeture.
 */
export function ColumnFilterButton({ ariaLabel, options, selected, onChange }: ColumnFilterButtonProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const popoverId = useId();

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const toggle = (value: string) => {
    const next = new Set(selected);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    onChange(next);
  };

  const reset = () => onChange(new Set());

  const isActive = selected.size > 0;

  return (
    <div ref={containerRef} style={{ position: "relative", display: "inline-block" }}>
      <HeaderIconButton
        icon="fr-icon-filter-line"
        ariaLabel={ariaLabel}
        active={isActive}
        ariaExpanded={open}
        ariaControls={popoverId}
        onClick={() => setOpen((o) => !o)}
      />
      {open && (
        <div
          id={popoverId}
          role="dialog"
          aria-label={ariaLabel}
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            zIndex: 100,
            minWidth: "240px",
            maxHeight: "320px",
            overflowY: "auto",
            background: "var(--background-default-grey)",
            border: "1px solid var(--border-default-grey)",
            boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
            padding: "0.75rem",
          }}>
          {options.length === 0 ? (
            <p className="fr-text--sm fr-mb-0" style={{ color: "var(--text-mention-grey)" }}>
              Aucune option
            </p>
          ) : (
            <>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {options.map((opt) => (
                  <div key={opt.value} className="fr-checkbox-group fr-checkbox-group--sm fr-mb-0">
                    <input
                      type="checkbox"
                      id={`${popoverId}-${opt.value}`}
                      checked={selected.has(opt.value)}
                      onChange={() => toggle(opt.value)}
                    />
                    <label className="fr-label" htmlFor={`${popoverId}-${opt.value}`}>
                      {opt.label}
                    </label>
                  </div>
                ))}
              </div>
              {isActive && (
                <button type="button" className="fr-btn fr-btn--tertiary fr-btn--sm fr-mt-2w" onClick={reset}>
                  Réinitialiser
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
