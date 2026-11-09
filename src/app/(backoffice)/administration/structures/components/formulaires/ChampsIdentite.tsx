"use client";

import type { ChangeEvent } from "react";
import type { IdentiteStructure } from "@/features/backoffice";

export interface IdentiteFormulaire {
  nom: string;
  siret: string;
  adresse: string;
  telephone: string;
  horaires: string;
}

export function identiteDepuis(identite: IdentiteStructure | null): IdentiteFormulaire {
  return {
    nom: identite?.nom ?? "",
    siret: identite?.siret ?? "",
    adresse: identite?.adresse ?? "",
    telephone: identite?.telephone ?? "",
    horaires: identite?.horaires ?? "",
  };
}

export function identiteRemplie(formulaire: IdentiteFormulaire, siretRequis: boolean): boolean {
  return formulaire.nom.trim() !== "" && (!siretRequis || formulaire.siret.trim() !== "");
}

interface ChampsIdentiteProps {
  idPrefix: string;
  valeur: IdentiteFormulaire;
  onChange: (valeur: IdentiteFormulaire) => void;
  siretRequis: boolean;
  isLoading?: boolean;
}

export default function ChampsIdentite({
  idPrefix,
  valeur,
  onChange,
  siretRequis,
  isLoading = false,
}: ChampsIdentiteProps) {
  const champ = (nom: keyof IdentiteFormulaire) => ({
    id: `${idPrefix}-${nom}`,
    value: valeur[nom],
    disabled: isLoading,
    onChange: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      onChange({ ...valeur, [nom]: e.target.value }),
  });

  return (
    <>
      <div className="fr-grid-row fr-grid-row--gutters">
        <div className="fr-col-12 fr-col-md-7">
          <div className="fr-input-group">
            <label className="fr-label" htmlFor={`${idPrefix}-nom`}>
              Nom
            </label>
            <input className="fr-input" type="text" required {...champ("nom")} />
          </div>
        </div>
        <div className="fr-col-12 fr-col-md-5">
          <div className="fr-input-group">
            <label className="fr-label" htmlFor={`${idPrefix}-siret`}>
              SIRET
              <span className="fr-hint-text">
                {siretRequis ? "14 chiffres, obligatoire pour une AMO ou un expert" : "14 chiffres. Facultatif"}
              </span>
            </label>
            <input className="fr-input" type="text" inputMode="numeric" required={siretRequis} {...champ("siret")} />
          </div>
        </div>
      </div>

      <div className="fr-input-group">
        <label className="fr-label" htmlFor={`${idPrefix}-adresse`}>
          Adresse
          <span className="fr-hint-text">Facultatif</span>
        </label>
        <textarea className="fr-input" rows={2} {...champ("adresse")} />
      </div>

      <div className="fr-input-group">
        <label className="fr-label" htmlFor={`${idPrefix}-telephone`}>
          Téléphone
          <span className="fr-hint-text">Facultatif</span>
        </label>
        <input className="fr-input" type="tel" {...champ("telephone")} />
      </div>

      <div className="fr-input-group">
        <label className="fr-label" htmlFor={`${idPrefix}-horaires`}>
          Horaires d&apos;ouverture
          <span className="fr-hint-text">Texte libre, 1 à 2 lignes, affiché aux demandeurs. Facultatif</span>
        </label>
        <textarea
          className="fr-input"
          rows={2}
          placeholder={"Lundi 13h - 17h30\nDu mardi au vendredi 8h30 - 12h / 13h - 17h30"}
          {...champ("horaires")}
        />
      </div>
    </>
  );
}
