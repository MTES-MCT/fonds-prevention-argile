"use client";

import type { ChangeEvent } from "react";
import type { ExpertGestion } from "@/features/backoffice";
import { getDepartementName } from "@/shared/constants/departements.constants";
import { getAllDepartementsEligibles, isDepartementEligible } from "@/shared/constants/rga.constants";

const DEPARTEMENTS_DISPOSITIF = getAllDepartementsEligibles();

// Raison sociale et SIRET sont ceux de la structure : ils se modifient avec son identité.
export interface ExpertFormulaire {
  dateValidationDhup: string;
  contactInterneNom: string;
  contactInterneEmail: string;
  contactInterneTelephone: string;
  departements: DepartementFormulaire[];
}

interface DepartementFormulaire {
  code: string;
  email: string;
  telephone: string;
  expertNom: string;
  expertEmail: string;
  expertTelephone: string;
  forfaitDiagnosticHt: string;
  forfaitReseauHt: string;
}

const DEPARTEMENT_VIDE: DepartementFormulaire = {
  code: "",
  email: "",
  telephone: "",
  expertNom: "",
  expertEmail: "",
  expertTelephone: "",
  forfaitDiagnosticHt: "",
  forfaitReseauHt: "",
};

const VIDE: ExpertFormulaire = {
  dateValidationDhup: "",
  contactInterneNom: "",
  contactInterneEmail: "",
  contactInterneTelephone: "",
  departements: [DEPARTEMENT_VIDE],
};

const montantSaisi = (montant: number | null) =>
  montant === null ? "" : (Number.isInteger(montant) ? String(montant) : montant.toFixed(2)).replace(".", ",");

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
      expertNom: d.expertNom ?? "",
      expertEmail: d.expertEmail ?? "",
      expertTelephone: d.expertTelephone ?? "",
      forfaitDiagnosticHt: montantSaisi(d.forfaitDiagnosticHt),
      forfaitReseauHt: montantSaisi(d.forfaitReseauHt),
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

  const modifierDepartement = (index: number, cle: keyof DepartementFormulaire, texte: string) =>
    onChange({
      ...valeur,
      departements: valeur.departements.map((d, i) => (i === index ? { ...d, [cle]: texte } : d)),
    });

  const champDepartement = (
    index: number,
    cle: Exclude<keyof DepartementFormulaire, "code">,
    libelle: string,
    type: "text" | "email" | "tel" | "montant",
    largeur: string
  ) => (
    <div className={`fr-col-12 ${largeur}`}>
      <div className="fr-input-group">
        <label className="fr-label" htmlFor={`${idPrefix}-dep-${cle}-${index}`}>
          {libelle}
        </label>
        <input
          className="fr-input"
          type={type === "montant" ? "text" : type}
          inputMode={type === "montant" ? "decimal" : undefined}
          id={`${idPrefix}-dep-${cle}-${index}`}
          value={valeur.departements[index][cle]}
          disabled={isLoading}
          onChange={(e) => modifierDepartement(index, cle, e.target.value)}
        />
      </div>
    </div>
  );

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
            Le contact de réservation, l&apos;expert qui se déplace et les forfaits sont communiqués aux agents.
          </span>
        </legend>
        {valeur.departements.map((departement, index) => (
          <div
            key={index}
            className="fr-fieldset__element fr-p-2w fr-mb-2w"
            style={{ border: "1px solid var(--border-default-grey)" }}>
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
                    {/* Un département déjà enregistré hors du dispositif reste lisible, pour pouvoir le changer. */}
                    {departement.code && !isDepartementEligible(departement.code) && (
                      <option value={departement.code}>
                        {departement.code} - {getDepartementName(departement.code)} (hors dispositif)
                      </option>
                    )}
                    {DEPARTEMENTS_DISPOSITIF.map((d) => (
                      <option key={d.code} value={d.code}>
                        {d.code} - {d.nom}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              {champDepartement(index, "email", "Email de réservation", "email", "fr-col-md-4")}
              {champDepartement(index, "telephone", "Téléphone de réservation", "tel", "fr-col-md-3")}
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
            <p className="fr-text--sm fr-text--bold fr-mt-2w fr-mb-0">
              Expert qui se déplace chez le demandeur
              <span className="fr-hint-text">Facultatif, quand ce n&apos;est pas le contact de réservation.</span>
            </p>
            <div className="fr-grid-row fr-grid-row--gutters">
              {champDepartement(index, "expertNom", "Nom", "text", "fr-col-md-4")}
              {champDepartement(index, "expertEmail", "Email", "email", "fr-col-md-4")}
              {champDepartement(index, "expertTelephone", "Téléphone", "tel", "fr-col-md-3")}
            </div>
            <p className="fr-text--sm fr-text--bold fr-mt-2w fr-mb-0">
              Forfaits de la prestation
              <span className="fr-hint-text">En euros HT, facultatifs. Exemple : 1 200 ou 1 200,50.</span>
            </p>
            <div className="fr-grid-row fr-grid-row--gutters">
              {champDepartement(index, "forfaitDiagnosticHt", "Forfait diagnostic", "montant", "fr-col-md-4")}
              {champDepartement(index, "forfaitReseauHt", "Forfait réseaux", "montant", "fr-col-md-4")}
            </div>
          </div>
        ))}
        <div className="fr-fieldset__element">
          <button
            type="button"
            className="fr-btn fr-btn--secondary fr-btn--sm fr-btn--icon-left fr-icon-add-line"
            disabled={isLoading}
            onClick={() => onChange({ ...valeur, departements: [...valeur.departements, DEPARTEMENT_VIDE] })}>
            Ajouter un département
          </button>
        </div>
      </fieldset>
    </>
  );
}
