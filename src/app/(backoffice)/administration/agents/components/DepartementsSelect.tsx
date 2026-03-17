"use client";

import { useState, useRef, useEffect } from "react";
import { DEPARTEMENTS } from "@/shared/constants/departements.constants";

interface DepartementsSelectProps {
  value: string[];
  onChange: (value: string[]) => void;
  disabled?: boolean;
  placeholder?: string;
}

/**
 * Liste des départements pour le select
 * Exclut "20" (Corse générique) car on a 2A et 2B
 */
const DEPARTEMENTS_LIST = Object.entries(DEPARTEMENTS)
  .filter(([code]) => code !== "20")
  .map(([code, name]) => ({ code, name }))
  .sort((a, b) => {
    // Trier numériquement puis alphabétiquement pour les DOM-TOM
    const aNum = parseInt(a.code, 10);
    const bNum = parseInt(b.code, 10);
    if (!isNaN(aNum) && !isNaN(bNum)) return aNum - bNum;
    if (!isNaN(aNum)) return -1;
    if (!isNaN(bNum)) return 1;
    return a.code.localeCompare(b.code);
  });

export default function DepartementsSelect({
  value,
  onChange,
  disabled = false,
  placeholder = "Sélectionner des départements...",
}: DepartementsSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fermer le dropdown si clic à l'extérieur
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filtrer les départements selon la recherche
  const filteredDepartements = DEPARTEMENTS_LIST.filter(
    (dept) =>
      dept.code.toLowerCase().includes(search.toLowerCase()) || dept.name.toLowerCase().includes(search.toLowerCase())
  );

  // Ajouter un département
  const addDepartement = (code: string) => {
    if (!value.includes(code)) {
      onChange([...value, code]);
    }
    setSearch("");
    inputRef.current?.focus();
  };

  // Supprimer un département
  const removeDepartement = (code: string) => {
    onChange(value.filter((c) => c !== code));
  };

  // Toggle un département
  const toggleDepartement = (code: string) => {
    if (value.includes(code)) {
      removeDepartement(code);
    } else {
      addDepartement(code);
    }
  };

  return (
    <div ref={containerRef}>
      {/* Chips des départements sélectionnés + input */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "0.25rem",
          padding: "0.5rem",
          minHeight: "42px",
          border: `1px solid ${isOpen ? "var(--border-active-blue-france)" : "var(--border-default-grey)"}`,
          borderRadius: "0.25rem 0.25rem 0 0",
          backgroundColor: disabled ? "var(--background-disabled-grey)" : "var(--background-default-grey)",
          cursor: disabled ? "default" : "text",
        }}
        onClick={() => {
          if (!disabled) {
            setIsOpen(true);
            inputRef.current?.focus();
          }
        }}>
        {/* Chips */}
        {value.map((code) => (
          <span
            key={code}
            className="fr-tag fr-tag--sm fr-tag--dismiss"
            style={{ margin: 0 }}
            aria-label={`Retirer ${code} ${DEPARTEMENTS[code]}`}
            onClick={(e) => {
              e.stopPropagation();
              if (!disabled) removeDepartement(code);
            }}>
            {code} - {DEPARTEMENTS[code]}
          </span>
        ))}

        {/* Input de recherche */}
        {!disabled && (
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onFocus={() => setIsOpen(true)}
            placeholder={value.length === 0 ? placeholder : "Rechercher..."}
            style={{
              flex: 1,
              minWidth: "120px",
              outline: "none",
              border: "none",
              backgroundColor: "transparent",
              fontSize: "0.875rem",
              padding: "0.25rem",
            }}
          />
        )}
      </div>

      {/* Liste des départements (inline, pas absolute) */}
      {isOpen && !disabled && (
        <div
          style={{
            maxHeight: "200px",
            overflowY: "auto",
            border: "1px solid var(--border-active-blue-france)",
            borderTop: "none",
            borderRadius: "0 0 0.25rem 0.25rem",
            backgroundColor: "var(--background-default-grey)",
          }}>
          {filteredDepartements.length === 0 ? (
            <div style={{ padding: "0.75rem", fontSize: "0.875rem", color: "var(--text-mention-grey)" }}>
              Aucun département trouvé
            </div>
          ) : (
            filteredDepartements.map((dept) => {
              const isSelected = value.includes(dept.code);
              return (
                <button
                  key={dept.code}
                  type="button"
                  onClick={() => toggleDepartement(dept.code)}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    padding: "0.5rem 0.75rem",
                    fontSize: "0.875rem",
                    textAlign: "left",
                    border: "none",
                    cursor: "pointer",
                    backgroundColor: isSelected ? "var(--background-alt-blue-france)" : "transparent",
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) e.currentTarget.style.backgroundColor = "var(--background-default-grey-hover)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = isSelected
                      ? "var(--background-alt-blue-france)"
                      : "transparent";
                  }}>
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => {}}
                    style={{ pointerEvents: "none", accentColor: "var(--border-active-blue-france)" }}
                  />
                  <span style={{ fontWeight: 500 }}>{dept.code}</span>
                  <span style={{ color: "var(--text-mention-grey)" }}>{dept.name}</span>
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
