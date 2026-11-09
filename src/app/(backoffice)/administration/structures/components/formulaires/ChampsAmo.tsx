"use client";

import { codesDepartementsAmo, texteDepartementsAmo, type HabilitationAmoFiche } from "@/features/backoffice";
import { parseListe } from "@/shared/utils/liste.utils";
import SelectMultiple from "./SelectMultiple";
import { OPTIONS_DEPARTEMENTS } from "./options-departements";
import { optionsEpci, useReferentielEpci } from "./useReferentielEpci";

export interface AmoFormulaire {
  departements: string[];
  emails: string;
  epci: string[];
  communes: string;
}

/** Forme attendue par `habilitationAmoSchema`. */
export interface SaisieAmo {
  departements: string;
  emails: string;
  communes: string[];
  epci: string[];
}

export function amoDepuis(amo: HabilitationAmoFiche | null): AmoFormulaire {
  return {
    departements: codesDepartementsAmo(amo?.departements),
    emails: amo?.emails.join("; ") ?? "",
    epci: amo?.epci ?? [],
    communes: amo?.communes.join(", ") ?? "",
  };
}

export function versSaisieAmo(formulaire: AmoFormulaire): SaisieAmo {
  return {
    departements: texteDepartementsAmo(formulaire.departements),
    emails: formulaire.emails,
    communes: parseListe(formulaire.communes),
    epci: formulaire.epci,
  };
}

export function amoRemplie(formulaire: AmoFormulaire): boolean {
  return formulaire.departements.length > 0 && formulaire.emails.trim() !== "";
}

interface ChampsAmoProps {
  idPrefix: string;
  valeur: AmoFormulaire;
  onChange: (valeur: AmoFormulaire) => void;
  isLoading?: boolean;
}

export default function ChampsAmo({ idPrefix, valeur, onChange, isLoading = false }: ChampsAmoProps) {
  const { epcis, erreur } = useReferentielEpci();

  return (
    <>
      <SelectMultiple
        id={`${idPrefix}-departements`}
        label="Départements"
        options={OPTIONS_DEPARTEMENTS}
        valeurs={valeur.departements}
        onChange={(departements) => onChange({ ...valeur, departements })}
        placeholder="Rechercher un département par nom ou numéro"
        disabled={isLoading}
      />

      <div className="fr-input-group">
        <label className="fr-label" htmlFor={`${idPrefix}-emails`}>
          Emails de l&apos;équipe
          <span className="fr-hint-text">Séparés par des virgules ou des points-virgules</span>
        </label>
        <input
          className="fr-input"
          type="text"
          id={`${idPrefix}-emails`}
          required
          placeholder="email1@exemple.fr; email2@exemple.fr"
          value={valeur.emails}
          disabled={isLoading}
          onChange={(e) => onChange({ ...valeur, emails: e.target.value })}
        />
      </div>

      <SelectMultiple
        id={`${idPrefix}-epci`}
        label={
          <>
            EPCI
            <span className="fr-hint-text">Facultatif. Ceux des départements choisis sont proposés en premier</span>
          </>
        }
        options={optionsEpci(epcis, valeur.departements)}
        valeurs={valeur.epci}
        onChange={(epci) => onChange({ ...valeur, epci })}
        placeholder="Rechercher un EPCI par nom ou code SIREN"
        disabled={isLoading}
        indisponible={erreur}
      />

      <div className="fr-input-group">
        <label className="fr-label" htmlFor={`${idPrefix}-communes`}>
          Codes INSEE spécifiques
          <span className="fr-hint-text">Séparés par des virgules. Facultatif</span>
        </label>
        <input
          className="fr-input"
          type="text"
          id={`${idPrefix}-communes`}
          placeholder="75001, 75002, 75003"
          value={valeur.communes}
          disabled={isLoading}
          onChange={(e) => onChange({ ...valeur, communes: e.target.value })}
        />
      </div>
    </>
  );
}
