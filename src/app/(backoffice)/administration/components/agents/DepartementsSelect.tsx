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
    <div ref={containerRef} className="relative">
      {/* Chips des départements sélectionnés + input */}
      <div
        className={`fr-input-wrap flex flex-wrap gap-1 p-2 min-h-[42px] border rounded cursor-text ${
          disabled ? "bg-gray-100" : "bg-white"
        } ${isOpen ? "border-blue-500" : "border-gray-300"}`}
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
            className="inline-flex items-center gap-1 px-2 py-1 text-sm bg-blue-100 text-blue-800 rounded">
            <span className="font-medium">{code}</span>
            <span className="text-xs text-blue-600">{DEPARTEMENTS[code]}</span>
            {!disabled && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeDepartement(code);
                }}
                className="ml-1 text-blue-600 hover:text-blue-800">
                ×
              </button>
            )}
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
            placeholder={value.length === 0 ? placeholder : ""}
            className="flex-1 min-w-[120px] outline-none border-none bg-transparent text-sm"
          />
        )}
      </div>

      {/* Dropdown */}
      {isOpen && !disabled && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded shadow-lg max-h-60 overflow-y-auto">
          {filteredDepartements.length === 0 ? (
            <div className="p-3 text-sm text-gray-500">Aucun département trouvé</div>
          ) : (
            <ul className="py-1">
              {filteredDepartements.map((dept) => {
                const isSelected = value.includes(dept.code);
                return (
                  <li key={dept.code}>
                    <button
                      type="button"
                      onClick={() => toggleDepartement(dept.code)}
                      className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2 ${
                        isSelected ? "bg-blue-50" : ""
                      }`}>
                      <input type="checkbox" checked={isSelected} onChange={() => {}} className="pointer-events-none" />
                      <span className="font-medium">{dept.code}</span>
                      <span className="text-gray-600">{dept.name}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
