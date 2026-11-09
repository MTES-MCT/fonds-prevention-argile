"use client";

import type { ChangeEvent } from "react";
import type { HabilitationAllersVersFiche } from "@/features/backoffice";
import { parseListe } from "@/shared/utils/liste.utils";

export interface AllersVersFormulaire {
  emails: string;
  departements: string;
  epci: string;
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
    departements: allersVers?.departements.join(", ") ?? "",
    epci: allersVers?.epci.join(", ") ?? "",
  };
}

export function versSaisieAllersVers(formulaire: AllersVersFormulaire): SaisieAllersVers {
  return {
    emails: formulaire.emails,
    departements: parseListe(formulaire.departements),
    epci: parseListe(formulaire.epci),
  };
}

export function allersVersRempli(formulaire: AllersVersFormulaire): boolean {
  return formulaire.emails.trim() !== "" && (formulaire.departements.trim() !== "" || formulaire.epci.trim() !== "");
}

interface ChampsAllersVersProps {
  idPrefix: string;
  valeur: AllersVersFormulaire;
  onChange: (valeur: AllersVersFormulaire) => void;
  isLoading?: boolean;
}

export default function ChampsAllersVers({ idPrefix, valeur, onChange, isLoading = false }: ChampsAllersVersProps) {
  const champ = (nom: keyof AllersVersFormulaire) => ({
    id: `${idPrefix}-${nom}`,
    value: valeur[nom],
    disabled: isLoading,
    onChange: (e: ChangeEvent<HTMLInputElement>) => onChange({ ...valeur, [nom]: e.target.value }),
  });

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
          required
          placeholder="email1@exemple.fr; email2@exemple.fr"
          {...champ("emails")}
        />
      </div>

      <div className="fr-input-group">
        <label className="fr-label" htmlFor={`${idPrefix}-departements`}>
          Codes départements
          <span className="fr-hint-text">Séparés par des virgules. Ex : 36, 18</span>
        </label>
        <input className="fr-input" type="text" {...champ("departements")} />
      </div>

      <div className="fr-input-group">
        <label className="fr-label" htmlFor={`${idPrefix}-epci`}>
          Codes EPCI
          <span className="fr-hint-text">
            Séparés par des virgules. Au moins un département ou un EPCI est nécessaire
          </span>
        </label>
        <input className="fr-input" type="text" placeholder="200054781, 200054807" {...champ("epci")} />
      </div>
    </>
  );
}
