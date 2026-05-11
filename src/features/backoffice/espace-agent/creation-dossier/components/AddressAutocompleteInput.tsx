"use client";

import { useEffect, useId, useState } from "react";
import { useDebounce } from "@/shared/hooks/useDebounce";
import { searchAddress, MIN_QUERY_LENGTH, type BanFeature } from "@/shared/adapters/ban";

interface AddressAutocompleteInputProps {
  /** Label affiché au-dessus du champ. */
  label: string;
  /** Texte d'aide affiché sous le label. */
  hint?: string;
  /** Valeur courante (label de l'adresse). */
  value: string;
  /** Callback appelé à chaque saisie ou sélection. */
  onChange: (value: string) => void;
}

const SEARCH_DEBOUNCE_DELAY = 300;
const MAX_RESULTS = 5;

/**
 * Input texte avec autocomplétion d'adresses via l'API BAN (IGN Géoplateforme).
 * Affiche une liste déroulante de suggestions sous le champ ; au clic sur une
 * suggestion, le label complet de l'adresse est injecté dans `onChange`.
 *
 * Variante simplifiée de `StepAdresse` du simulateur — pas de carte ni de
 * sélection de bâtiment, juste un texte. Utilisé pour le parcours sans
 * simulation du wizard invitation.
 */
export function AddressAutocompleteInput({ label, hint, value, onChange }: AddressAutocompleteInputProps) {
  const inputId = useId();
  const listId = useId();
  const [isOpen, setIsOpen] = useState(false);
  const [results, setResults] = useState<BanFeature[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const debouncedValue = useDebounce(value, SEARCH_DEBOUNCE_DELAY);

  useEffect(() => {
    const fetch = async () => {
      if (!debouncedValue || debouncedValue.trim().length < MIN_QUERY_LENGTH) {
        setResults([]);
        return;
      }
      setIsSearching(true);
      try {
        const found = await searchAddress(debouncedValue, { limit: MAX_RESULTS });
        setResults(found);
      } catch (err) {
        console.error("[AddressAutocompleteInput] Erreur recherche adresse :", err);
        setResults([]);
      } finally {
        setIsSearching(false);
      }
    };
    fetch();
  }, [debouncedValue]);

  const handleSelect = (feature: BanFeature) => {
    onChange(feature.properties.label);
    setIsOpen(false);
  };

  return (
    <div className="fr-input-group relative">
      <label className="fr-label" htmlFor={inputId}>
        {label}
        {hint && <span className="fr-hint-text">{hint}</span>}
      </label>
      <input
        className="fr-input"
        type="text"
        id={inputId}
        autoComplete="off"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={isOpen && results.length > 0}
        aria-controls={listId}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        onBlur={() => setTimeout(() => setIsOpen(false), 150)}
      />

      {isOpen && results.length > 0 && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-10 w-full bg-white border border-gray-300 shadow-md max-h-72 overflow-auto fr-mt-1v">
          {results.map((feature) => (
            <li key={`${feature.properties.id}-${feature.properties.label}`} role="option" aria-selected="false">
              <button
                type="button"
                className="block w-full text-left px-4 py-2 hover:bg-gray-100"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleSelect(feature)}>
                {feature.properties.label}
              </button>
            </li>
          ))}
        </ul>
      )}

      {isSearching && value.length >= MIN_QUERY_LENGTH && results.length === 0 && (
        <p className="fr-hint-text fr-mt-1v">Recherche en cours…</p>
      )}
    </div>
  );
}
