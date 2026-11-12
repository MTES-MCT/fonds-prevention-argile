"use client";

import { useEffect, useState, type ChangeEvent } from "react";
import { DEPARTEMENTS_OFFICIELS, type ExpertGestion } from "@/features/backoffice";
import ModaleStructure from "../../structures/components/ModaleStructure";
import { fermerModale } from "../../structures/components/fermer-modale";

export interface ExpertFormulaire {
  nom: string;
  siret: string;
  dateValidationDhup: string;
  contactInterneNom: string;
  contactInterneEmail: string;
  contactInterneTelephone: string;
  departements: { code: string; email: string; telephone: string }[];
}

interface ExpertFormModalProps {
  modalId: string;
  expert: ExpertGestion | null;
  onConfirm: (formulaire: ExpertFormulaire) => Promise<boolean>;
  erreur?: string | null;
  isLoading?: boolean;
}

const VIDE: ExpertFormulaire = {
  nom: "",
  siret: "",
  dateValidationDhup: "",
  contactInterneNom: "",
  contactInterneEmail: "",
  contactInterneTelephone: "",
  departements: [{ code: "", email: "", telephone: "" }],
};

function depuisExpert(expert: ExpertGestion | null): ExpertFormulaire {
  if (!expert) return VIDE;
  return {
    nom: expert.nom,
    siret: expert.siret,
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

// Création et modification : sans expert sélectionné, la modale crée.
export default function ExpertFormModal({
  modalId,
  expert,
  onConfirm,
  erreur = null,
  isLoading = false,
}: ExpertFormModalProps) {
  const [formulaire, setFormulaire] = useState<ExpertFormulaire>(VIDE);

  useEffect(() => {
    setFormulaire(depuisExpert(expert));
  }, [expert]);

  const champ = (nom: keyof Omit<ExpertFormulaire, "departements">) => ({
    id: `${modalId}-${nom}`,
    value: formulaire[nom],
    disabled: isLoading,
    onChange: (e: ChangeEvent<HTMLInputElement>) => setFormulaire({ ...formulaire, [nom]: e.target.value }),
  });

  const modifierDepartement = (index: number, cle: "code" | "email" | "telephone", valeur: string) =>
    setFormulaire({
      ...formulaire,
      departements: formulaire.departements.map((d, i) => (i === index ? { ...d, [cle]: valeur } : d)),
    });

  const handleConfirm = async () => {
    if (await onConfirm(formulaire)) fermerModale(modalId);
  };

  const remplie =
    formulaire.nom.trim() !== "" &&
    formulaire.siret.trim() !== "" &&
    formulaire.departements.length > 0 &&
    formulaire.departements.every((d) => d.code);

  return (
    <ModaleStructure
      modalId={modalId}
      titre={expert ? `Modifier « ${expert.nom} »` : "Ajouter un expert"}
      erreur={erreur}
      libelleConfirmation="Enregistrer"
      libelleEnCours="Enregistrement..."
      confirmationPossible={remplie}
      onConfirm={handleConfirm}
      isLoading={isLoading}
      large>
      <div className="fr-grid-row fr-grid-row--gutters">
        <div className="fr-col-12 fr-col-md-7">
          <div className="fr-input-group">
            <label className="fr-label" htmlFor={`${modalId}-nom`}>
              Raison sociale
            </label>
            <input className="fr-input" type="text" {...champ("nom")} />
          </div>
        </div>
        <div className="fr-col-12 fr-col-md-5">
          <div className="fr-input-group">
            <label className="fr-label" htmlFor={`${modalId}-siret`}>
              SIRET
              <span className="fr-hint-text">14 chiffres</span>
            </label>
            <input className="fr-input" type="text" inputMode="numeric" {...champ("siret")} />
          </div>
        </div>
        <div className="fr-col-12 fr-col-md-5">
          <div className="fr-input-group">
            <label className="fr-label" htmlFor={`${modalId}-dateValidationDhup`}>
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
            <label className="fr-label" htmlFor={`${modalId}-contactInterneNom`}>
              Nom
            </label>
            <input className="fr-input" type="text" {...champ("contactInterneNom")} />
          </div>
        </div>
        <div className="fr-fieldset__element fr-fieldset__element--inline">
          <div className="fr-input-group">
            <label className="fr-label" htmlFor={`${modalId}-contactInterneEmail`}>
              Email
            </label>
            <input className="fr-input" type="email" {...champ("contactInterneEmail")} />
          </div>
        </div>
        <div className="fr-fieldset__element fr-fieldset__element--inline">
          <div className="fr-input-group">
            <label className="fr-label" htmlFor={`${modalId}-contactInterneTelephone`}>
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
        {formulaire.departements.map((departement, index) => (
          <div key={index} className="fr-fieldset__element">
            <div className="fr-grid-row fr-grid-row--gutters fr-grid-row--bottom">
              <div className="fr-col-12 fr-col-md-4">
                <div className="fr-select-group">
                  <label className="fr-label" htmlFor={`${modalId}-dep-${index}`}>
                    Département
                  </label>
                  <select
                    className="fr-select"
                    id={`${modalId}-dep-${index}`}
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
                  <label className="fr-label" htmlFor={`${modalId}-dep-email-${index}`}>
                    Email de réservation
                  </label>
                  <input
                    className="fr-input"
                    type="email"
                    id={`${modalId}-dep-email-${index}`}
                    value={departement.email}
                    disabled={isLoading}
                    onChange={(e) => modifierDepartement(index, "email", e.target.value)}
                  />
                </div>
              </div>
              <div className="fr-col-12 fr-col-md-3">
                <div className="fr-input-group">
                  <label className="fr-label" htmlFor={`${modalId}-dep-tel-${index}`}>
                    Téléphone
                  </label>
                  <input
                    className="fr-input"
                    type="tel"
                    id={`${modalId}-dep-tel-${index}`}
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
                  disabled={isLoading || formulaire.departements.length === 1}
                  onClick={() =>
                    setFormulaire({
                      ...formulaire,
                      departements: formulaire.departements.filter((_, i) => i !== index),
                    })
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
              setFormulaire({
                ...formulaire,
                departements: [...formulaire.departements, { code: "", email: "", telephone: "" }],
              })
            }>
            Ajouter un département
          </button>
        </div>
      </fieldset>
    </ModaleStructure>
  );
}
