"use client";

import { useId, useMemo, useState, type KeyboardEvent, type ReactNode } from "react";

export interface OptionSelect {
  valeur: string;
  libelle: string;
  // Texte de recherche en plus du libellé (code, département…).
  motsCles?: string;
}

interface SelectMultipleProps {
  id: string;
  label: ReactNode;
  options: OptionSelect[];
  valeurs: string[];
  onChange: (valeurs: string[]) => void;
  placeholder: string;
  disabled?: boolean;
  // Message sous le champ quand la liste n'a pas pu être chargée.
  indisponible?: string | null;
  // Libellé d'une valeur absente des options (code inconnu du référentiel).
  libelleInconnu?: (valeur: string) => string;
  maxResultats?: number;
}

const normaliser = (texte: string) =>
  texte
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

/** Liste déroulante à choix multiples, avec recherche : les choix s'affichent en étiquettes retirables. */
export default function SelectMultiple({
  id,
  label,
  options,
  valeurs,
  onChange,
  placeholder,
  disabled = false,
  indisponible = null,
  libelleInconnu = (valeur) => valeur,
  maxResultats = 60,
}: SelectMultipleProps) {
  const [recherche, setRecherche] = useState("");
  const [ouvert, setOuvert] = useState(false);
  const [actif, setActif] = useState(0);
  const idListe = `${id}-liste`;
  const prefixeOption = useId();

  const libelles = useMemo(() => new Map(options.map((option) => [option.valeur, option.libelle])), [options]);
  const correspondances = useMemo(() => {
    const termes = normaliser(recherche).split(/\s+/).filter(Boolean);
    return options.filter((option) => {
      const texte = normaliser(`${option.libelle} ${option.valeur} ${option.motsCles ?? ""}`);
      return termes.every((terme) => texte.includes(terme));
    });
  }, [options, recherche]);
  const resultats = correspondances.slice(0, maxResultats);
  const masques = correspondances.length - resultats.length;

  const basculer = (valeur: string) =>
    onChange(valeurs.includes(valeur) ? valeurs.filter((v) => v !== valeur) : [...valeurs, valeur]);

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOuvert(true);
      setActif((index) => Math.min(index + 1, resultats.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActif((index) => Math.max(index - 1, 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      if (ouvert && resultats[actif]) basculer(resultats[actif].valeur);
    } else if (event.key === "Escape") {
      setOuvert(false);
    } else if (event.key === "Backspace" && recherche === "" && valeurs.length > 0) {
      onChange(valeurs.slice(0, -1));
    }
  };

  return (
    <div
      className="fr-input-group"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOuvert(false);
      }}>
      <label className="fr-label" htmlFor={id}>
        {label}
      </label>
      {valeurs.length > 0 && (
        <ul className="fr-tags-group fr-mt-1w fr-mb-0">
          {valeurs.map((valeur) => {
            const libelle = libelles.get(valeur) ?? libelleInconnu(valeur);
            return (
              <li key={valeur}>
                <button
                  type="button"
                  className="fr-tag fr-tag--sm fr-tag--dismiss"
                  aria-label={`Retirer ${libelle}`}
                  disabled={disabled}
                  onClick={() => basculer(valeur)}>
                  {libelle}
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <input
        className="fr-input"
        id={id}
        type="text"
        role="combobox"
        autoComplete="off"
        aria-expanded={ouvert}
        aria-controls={idListe}
        aria-autocomplete="list"
        aria-activedescendant={ouvert && resultats[actif] ? `${prefixeOption}-${actif}` : undefined}
        placeholder={placeholder}
        value={recherche}
        disabled={disabled}
        onFocus={() => setOuvert(true)}
        onClick={() => setOuvert(true)}
        onChange={(event) => {
          setRecherche(event.target.value);
          setActif(0);
          setOuvert(true);
        }}
        onKeyDown={onKeyDown}
      />
      {indisponible && <p className="fr-hint-text fr-mt-1v fr-mb-0">{indisponible}</p>}
      {ouvert && !disabled && (
        <ul
          id={idListe}
          role="listbox"
          aria-multiselectable="true"
          className="fr-raw-list max-h-64 overflow-y-auto border border-t-0 border-(--border-default-grey) bg-(--background-default-grey)">
          {resultats.map((option, index) => {
            const choisi = valeurs.includes(option.valeur);
            return (
              <li
                key={option.valeur}
                id={`${prefixeOption}-${index}`}
                role="option"
                aria-selected={choisi}
                // Garde le focus dans le champ, sinon la liste se fermerait avant le clic.
                onMouseDown={(event) => event.preventDefault()}
                onMouseEnter={() => setActif(index)}
                onClick={() => basculer(option.valeur)}
                className={`flex items-center gap-2 px-3 py-2 cursor-pointer text-sm ${
                  index === actif ? "bg-(--background-alt-grey)" : ""
                }`}>
                {/* Sans icône, une classe « fr-icon-- » seule dessinerait un carré plein. */}
                <span
                  className={`w-4 shrink-0 text-(--text-action-high-blue-france) ${choisi ? "fr-icon-check-line fr-icon--sm" : ""}`}
                  aria-hidden="true"
                />
                {option.libelle}
              </li>
            );
          })}
          {resultats.length === 0 && <li className="px-3 py-2 text-sm text-(--text-mention-grey)">Aucun résultat</li>}
          {masques > 0 && (
            <li className="px-3 py-2 text-sm text-(--text-mention-grey)">
              {masques} autre{masques > 1 ? "s" : ""} : affinez la recherche
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
