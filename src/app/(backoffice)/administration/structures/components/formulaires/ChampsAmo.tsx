"use client";

import type { ChangeEvent } from "react";
import type { HabilitationAmoFiche } from "@/features/backoffice";
import { parseListe } from "@/shared/utils/liste.utils";

export interface AmoFormulaire {
  departements: string;
  emails: string;
  epci: string;
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
    departements: amo?.departements ?? "",
    emails: amo?.emails.join("; ") ?? "",
    epci: amo?.epci.join(", ") ?? "",
    communes: amo?.communes.join(", ") ?? "",
  };
}

export function versSaisieAmo(formulaire: AmoFormulaire): SaisieAmo {
  return {
    departements: formulaire.departements,
    emails: formulaire.emails,
    communes: parseListe(formulaire.communes),
    epci: parseListe(formulaire.epci),
  };
}

export function amoRemplie(formulaire: AmoFormulaire): boolean {
  return formulaire.departements.trim() !== "" && formulaire.emails.trim() !== "";
}

interface ChampsAmoProps {
  idPrefix: string;
  valeur: AmoFormulaire;
  onChange: (valeur: AmoFormulaire) => void;
  isLoading?: boolean;
}

export default function ChampsAmo({ idPrefix, valeur, onChange, isLoading = false }: ChampsAmoProps) {
  const champ = (nom: keyof AmoFormulaire) => ({
    id: `${idPrefix}-${nom}`,
    value: valeur[nom],
    disabled: isLoading,
    onChange: (e: ChangeEvent<HTMLInputElement>) => onChange({ ...valeur, [nom]: e.target.value }),
  });

  return (
    <>
      <div className="fr-input-group">
        <label className="fr-label" htmlFor={`${idPrefix}-departements`}>
          Départements
          <span className="fr-hint-text">Ex : Indre 36, Cher 18</span>
        </label>
        <input className="fr-input" type="text" required {...champ("departements")} />
      </div>

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
        <label className="fr-label" htmlFor={`${idPrefix}-epci`}>
          Codes EPCI
          <span className="fr-hint-text">Séparés par des virgules. Facultatif</span>
        </label>
        <input className="fr-input" type="text" placeholder="200054781, 200054807" {...champ("epci")} />
      </div>

      <div className="fr-input-group">
        <label className="fr-label" htmlFor={`${idPrefix}-communes`}>
          Codes INSEE spécifiques
          <span className="fr-hint-text">Séparés par des virgules. Facultatif</span>
        </label>
        <input className="fr-input" type="text" placeholder="75001, 75002, 75003" {...champ("communes")} />
      </div>
    </>
  );
}
