"use client";

import type { ChangeEvent } from "react";
import { DEPARTEMENTS_OFFICIELS, type ExpertGestion } from "@/features/backoffice";

// Raison sociale et SIRET sont ceux de la structure : ils se modifient avec son identité.
export interface ExpertFormulaire {
  dateValidationDhup: string;
  contactInterneNom: string;
  contactInterneEmail: string;
  contactInterneTelephone: string;
  departements: { code: string; email: string; telephone: string }[];
}

const VIDE: ExpertFormulaire = {
  dateValidationDhup: "",
  contactInterneNom: "",
  contactInterneEmail: "",
  contactInterneTelephone: "",
  departements: [{ code: "", email: "", telephone: "" }],
};

export function expertDepuis(expert: ExpertGestion | null): ExpertFormulaire {
  if (!expert) return VIDE;
  return {
    dateValidationDhup: expert.dateValidationDhup ?? "",
    contactInterneNom: expert.contactInterne.nom ?? "",
    contactInterneEmail: expert.contactInterne.email ?? "",
    contactInterneTelephone: expert.contactInterne.telephone ?? "",
    departements: expert.departements.map((d) => ({
      code: d.code,
      email: d.email ?? "",
      telephone: d.telephone ?? "",
    })),
  };
}

/** Forme attendue par `habilitationExpertSchema` : une ligne de département sans code n'est pas envoyée. */
export function versSaisieExpert(formulaire: ExpertFormulaire): ExpertFormulaire {
  return { ...formulaire, departements: formulaire.departements.filter((d) => d.code) };
}

export function expertRempli(formulaire: ExpertFormulaire): boolean {
  return formulaire.departements.length > 0 && formulaire.departements.every((d) => d.code);
}

interface ChampsExpertProps {
  idPrefix: string;
  valeur: ExpertFormulaire;
  onChange: (valeur: ExpertFormulaire) => void;
  isLoading?: boolean;
}

export default function ChampsExpert({ idPrefix, valeur, onChange, isLoading = false }: ChampsExpertProps) {
  const champ = (nom: keyof Omit<ExpertFormulaire, "departements">) => ({
    id: `${idPrefix}-${nom}`,
    value: valeur[nom],
    disabled: isLoading,
    onChange: (e: ChangeEvent<HTMLInputElement>) => onChange({ ...valeur, [nom]: e.target.value }),
  });

  const modifierDepartement = (index: number, cle: "code" | "email" | "telephone", texte: string) =>
    onChange({
      ...valeur,
      departements: valeur.departements.map((d, i) => (i === index ? { ...d, [cle]: texte } : d)),
    });

  return (
    <>
      <div className="fr-grid-row fr-grid-row--gutters">
        <div className="fr-col-12 fr-col-md-5">
          <div className="fr-input-group">
            <label className="fr-label" htmlFor={`${idPrefix}-dateValidationDhup`}>
              Date de validation DHUP
              <span className="fr-hint-text">Facultatif</span>
            </label>
            <input className="fr-input" type="date" {...champ("dateValidationDhup")} />
          </div>
        </div>
      </div>

      <fieldset className="fr-fieldset fr-mt-2w">
        <legend className="fr-fieldset__legend">
          Contact interne
          <span className="fr-hint-text">Visible du super-administrateur seulement. Facultatif.</span>
        </legend>
        <div className="fr-fieldset__element fr-fieldset__element--inline">
          <div className="fr-input-group">
            <label className="fr-label" htmlFor={`${idPrefix}-contactInterneNom`}>
              Nom
            </label>
            <input className="fr-input" type="text" {...champ("contactInterneNom")} />
          </div>
        </div>
        <div className="fr-fieldset__element fr-fieldset__element--inline">
          <div className="fr-input-group">
            <label className="fr-label" htmlFor={`${idPrefix}-contactInterneEmail`}>
              Email
            </label>
            <input className="fr-input" type="email" {...champ("contactInterneEmail")} />
          </div>
        </div>
        <div className="fr-fieldset__element fr-fieldset__element--inline">
          <div className="fr-input-group">
            <label className="fr-label" htmlFor={`${idPrefix}-contactInterneTelephone`}>
              Téléphone
            </label>
            <input className="fr-input" type="tel" {...champ("contactInterneTelephone")} />
          </div>
        </div>
      </fieldset>

      <fieldset className="fr-fieldset fr-mt-2w">
        <legend className="fr-fieldset__legend">
          Départements d&apos;intervention
          <span className="fr-hint-text">
            Le contact de réservation de chaque département est communiqué aux agents.
          </span>
        </legend>
        {valeur.departements.map((departement, index) => (
          <div key={index} className="fr-fieldset__element">
            <div className="fr-grid-row fr-grid-row--gutters fr-grid-row--bottom">
              <div className="fr-col-12 fr-col-md-4">
                <div className="fr-select-group">
                  <label className="fr-label" htmlFor={`${idPrefix}-dep-${index}`}>
                    Département
                  </label>
                  <select
                    className="fr-select"
                    id={`${idPrefix}-dep-${index}`}
                    value={departement.code}
                    disabled={isLoading}
                    onChange={(e) => modifierDepartement(index, "code", e.target.value)}>
                    <option value="">Sélectionner</option>
                    {DEPARTEMENTS_OFFICIELS.map((d) => (
                      <option key={d.code} value={d.code}>
                        {d.code} - {d.nom}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="fr-col-12 fr-col-md-4">
                <div className="fr-input-group">
                  <label className="fr-label" htmlFor={`${idPrefix}-dep-email-${index}`}>
                    Email de réservation
                  </label>
                  <input
                    className="fr-input"
                    type="email"
                    id={`${idPrefix}-dep-email-${index}`}
                    value={departement.email}
                    disabled={isLoading}
                    onChange={(e) => modifierDepartement(index, "email", e.target.value)}
                  />
                </div>
              </div>
              <div className="fr-col-12 fr-col-md-3">
                <div className="fr-input-group">
                  <label className="fr-label" htmlFor={`${idPrefix}-dep-tel-${index}`}>
                    Téléphone
                  </label>
                  <input
                    className="fr-input"
                    type="tel"
                    id={`${idPrefix}-dep-tel-${index}`}
                    value={departement.telephone}
                    disabled={isLoading}
                    onChange={(e) => modifierDepartement(index, "telephone", e.target.value)}
                  />
                </div>
              </div>
              <div className="fr-col-12 fr-col-md-1">
                <button
                  type="button"
                  className="fr-btn fr-btn--tertiary-no-outline fr-btn--sm fr-icon-delete-line"
                  title="Retirer ce département"
                  disabled={isLoading || valeur.departements.length === 1}
                  onClick={() =>
                    onChange({ ...valeur, departements: valeur.departements.filter((_, i) => i !== index) })
                  }>
                  Retirer ce département
                </button>
              </div>
            </div>
          </div>
        ))}
        <div className="fr-fieldset__element">
          <button
            type="button"
            className="fr-btn fr-btn--secondary fr-btn--sm fr-btn--icon-left fr-icon-add-line"
            disabled={isLoading}
            onClick={() =>
              onChange({ ...valeur, departements: [...valeur.departements, { code: "", email: "", telephone: "" }] })
            }>
            Ajouter un département
          </button>
        </div>
      </fieldset>
    </>
  );
}
