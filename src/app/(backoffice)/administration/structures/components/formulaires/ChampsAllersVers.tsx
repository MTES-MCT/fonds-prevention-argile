"use client";

import type { HabilitationAllersVersFiche } from "@/features/backoffice";
import { toOfficialCodeDepartement } from "@/shared/constants/departements.constants";
import SelectMultiple from "./SelectMultiple";
import { libelleDepartementHorsDispositif, OPTIONS_DEPARTEMENTS } from "./options-departements";
import { optionsEpci, useReferentielEpci } from "./useReferentielEpci";

export interface AllersVersFormulaire {
  emails: string;
  departements: string[];
  epci: string[];
}

/** Forme attendue par `habilitationAllersVersSchema`. */
export interface SaisieAllersVers {
  emails: string;
  departements: string[];
  epci: string[];
}

export function allersVersDepuis(allersVers: HabilitationAllersVersFiche | null): AllersVersFormulaire {
  return {
    emails: allersVers?.emails.join("; ") ?? "",
    // Certaines couvertures stockent « 3 » pour l'Allier : la liste ne connaît que « 03 ».
    departements: [...new Set(allersVers?.departements.map(toOfficialCodeDepartement) ?? [])],
    epci: allersVers?.epci ?? [],
  };
}

export function versSaisieAllersVers(formulaire: AllersVersFormulaire): SaisieAllersVers {
  return { ...formulaire };
}

export function allersVersRempli(formulaire: AllersVersFormulaire): boolean {
  return formulaire.emails.trim() !== "" && formulaire.departements.length + formulaire.epci.length > 0;
}

interface ChampsAllersVersProps {
  idPrefix: string;
  valeur: AllersVersFormulaire;
  onChange: (valeur: AllersVersFormulaire) => void;
  isLoading?: boolean;
}

export default function ChampsAllersVers({ idPrefix, valeur, onChange, isLoading = false }: ChampsAllersVersProps) {
  const { epcis, erreur } = useReferentielEpci();

  return (
    <>
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
        id={`${idPrefix}-departements`}
        label={
          <>
            Départements
            <span className="fr-hint-text">Au moins un département ou un EPCI</span>
          </>
        }
        options={OPTIONS_DEPARTEMENTS}
        libelleInconnu={libelleDepartementHorsDispositif}
        valeurs={valeur.departements}
        onChange={(departements) => onChange({ ...valeur, departements })}
        placeholder="Rechercher un département par nom ou numéro"
        disabled={isLoading}
      />

      <SelectMultiple
        id={`${idPrefix}-epci`}
        label={
          <>
            EPCI
            <span className="fr-hint-text">Ceux des départements choisis sont proposés en premier</span>
          </>
        }
        options={optionsEpci(epcis, valeur.departements)}
        valeurs={valeur.epci}
        onChange={(epci) => onChange({ ...valeur, epci })}
        placeholder="Rechercher un EPCI par nom ou code SIREN"
        disabled={isLoading}
        indisponible={erreur}
      />
    </>
  );
}
