"use client";

import { useState, useEffect } from "react";
import { UserRole, type CompteAgent, type RolePlateforme } from "@/shared/domain/value-objects";
import DepartementsSelect from "./DepartementsSelect";
import { AgentWithPermissions } from "@/features/backoffice";

/**
 * Structure proposée au rattachement, avec les habilitations que l'agent en héritera
 */
export interface StructureOption {
  id: string;
  nom: string;
  amo: string | null;
  allersVers: string | null;
}

interface AgentFormModalProps {
  modalId: string;
  onSubmit: (data: AgentFormData) => Promise<void>;
  agent?: AgentWithPermissions | null;
  isLoading?: boolean;
  structures: StructureOption[];
}

export interface AgentFormData {
  email: string;
  givenName: string;
  usualName?: string;
  compte: CompteAgent;
  departements: string[];
}

type TypeCompte = RolePlateforme | "structure";

interface FormState {
  email: string;
  givenName: string;
  usualName: string;
  typeCompte: TypeCompte;
  structureId: string;
  departements: string[];
}

const TYPE_COMPTE_OPTIONS: { value: TypeCompte; label: string }[] = [
  { value: UserRole.SUPER_ADMINISTRATEUR, label: "Super Administrateur" },
  { value: UserRole.ADMINISTRATEUR, label: "Administrateur" },
  { value: UserRole.ANALYSTE, label: "Analyste" },
  { value: "structure", label: "Membre d'une structure (AMO, Aller-vers)" },
];

const FORMULAIRE_VIDE: FormState = {
  email: "",
  givenName: "",
  usualName: "",
  typeCompte: UserRole.ADMINISTRATEUR,
  structureId: "",
  departements: [],
};

function rolesDeStructure(structure: StructureOption): string {
  if (structure.amo && structure.allersVers) return "AMO et Aller-vers";
  if (structure.amo) return "AMO";
  if (structure.allersVers) return "Aller-vers";
  return "aucun rôle";
}

function etatInitial(agent: AgentWithPermissions): FormState {
  const { role, structureId } = agent.agent;
  const plateforme = TYPE_COMPTE_OPTIONS.find((option) => option.value !== "structure" && option.value === role);
  return {
    email: agent.agent.email,
    givenName: agent.agent.givenName,
    usualName: agent.agent.usualName || "",
    // Un compte orphelin (rôle de structure sans structure) doit en choisir une.
    typeCompte: structureId || !plateforme ? "structure" : plateforme.value,
    structureId: structureId ?? "",
    departements: agent.departements,
  };
}

export default function AgentFormModal({
  modalId,
  onSubmit,
  agent,
  isLoading = false,
  structures,
}: AgentFormModalProps) {
  const isEditing = !!agent;

  const [formData, setFormData] = useState<FormState>(FORMULAIRE_VIDE);
  const [error, setError] = useState<string | null>(null);

  // Initialiser le formulaire avec les données de l'agent en mode édition
  useEffect(() => {
    setFormData(agent ? etatInitial(agent) : FORMULAIRE_VIDE);
    setError(null);
  }, [agent]);

  const handleTypeCompteChange = (typeCompte: TypeCompte) => {
    setFormData((prev) => ({
      ...prev,
      typeCompte,
      structureId: typeCompte === "structure" ? prev.structureId : "",
      // Les départements ne valent que pour Administrateur et Analyste
      departements: typeCompte === UserRole.ADMINISTRATEUR || typeCompte === UserRole.ANALYSTE ? prev.departements : [],
    }));
  };

  const structureChoisie = structures.find((structure) => structure.id === formData.structureId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.email || !formData.email.includes("@")) {
      setError("Email invalide");
      return;
    }

    if (!formData.givenName.trim()) {
      setError("Le prénom est requis");
      return;
    }

    if (formData.typeCompte === "structure" && !formData.structureId) {
      setError("Une structure doit être sélectionnée");
      return;
    }

    const compte: CompteAgent =
      formData.typeCompte === "structure"
        ? { type: "structure", structureId: formData.structureId }
        : { type: "plateforme", role: formData.typeCompte };

    try {
      await onSubmit({
        email: formData.email,
        givenName: formData.givenName,
        usualName: formData.usualName,
        compte,
        departements: formData.departements,
      });

      // Fermer la modale via l'API DSFR
      const modal = document.getElementById(modalId);
      if (modal && window.dsfr) {
        window.dsfr(modal).modal.conceal();
      }

      setFormData(FORMULAIRE_VIDE);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue");
    }
  };

  return (
    <dialog id={modalId} className="fr-modal" aria-labelledby={`${modalId}-title`}>
      <div className="fr-container fr-container--fluid fr-container-md">
        <div className="fr-grid-row fr-grid-row--center">
          <div className="fr-col-12 fr-col-md-10 fr-col-lg-8">
            <div className="fr-modal__body">
              <div className="fr-modal__header">
                <button
                  aria-controls={modalId}
                  title="Fermer"
                  type="button"
                  className="fr-btn--close fr-btn"
                  disabled={isLoading}>
                  Fermer
                </button>
              </div>
              <div className="fr-modal__content">
                <h1 id={`${modalId}-title`} className="fr-modal__title">
                  <span
                    className={isEditing ? "fr-icon-edit-line fr-icon--lg" : "fr-icon-add-line fr-icon--lg"}
                    aria-hidden="true"></span>
                  {isEditing ? "Modifier l'agent" : "Ajouter un agent"}
                </h1>

                {error && (
                  <div className="fr-alert fr-alert--error fr-alert--sm fr-mb-3w">
                    <p>{error}</p>
                  </div>
                )}

                <form onSubmit={handleSubmit}>
                  {/* Email */}
                  <div className="fr-input-group">
                    <label className="fr-label" htmlFor={`${modalId}-email`}>
                      Email *
                    </label>
                    <input
                      type="email"
                      id={`${modalId}-email`}
                      className="fr-input"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      disabled={isLoading}
                      required
                    />
                    <p className="fr-hint-text">L&apos;agent pourra se connecter avec cet email via ProConnect</p>
                  </div>

                  {/* Prénom */}
                  <div className="fr-input-group">
                    <label className="fr-label" htmlFor={`${modalId}-givenName`}>
                      Prénom *
                    </label>
                    <input
                      type="text"
                      id={`${modalId}-givenName`}
                      className="fr-input"
                      value={formData.givenName}
                      onChange={(e) => setFormData({ ...formData, givenName: e.target.value })}
                      disabled={isLoading}
                      required
                    />
                  </div>

                  {/* Nom */}
                  <div className="fr-input-group">
                    <label className="fr-label" htmlFor={`${modalId}-usualName`}>
                      Nom
                    </label>
                    <input
                      type="text"
                      id={`${modalId}-usualName`}
                      className="fr-input"
                      value={formData.usualName}
                      onChange={(e) => setFormData({ ...formData, usualName: e.target.value })}
                      disabled={isLoading}
                    />
                  </div>

                  {/* Type de compte : le rôle d'un membre de structure vient de sa structure */}
                  <div className="fr-select-group">
                    <label className="fr-label" htmlFor={`${modalId}-typeCompte`}>
                      Type de compte *
                    </label>
                    <select
                      id={`${modalId}-typeCompte`}
                      className="fr-select"
                      value={formData.typeCompte}
                      onChange={(e) => handleTypeCompteChange(e.target.value as TypeCompte)}
                      disabled={isLoading}
                      required>
                      {TYPE_COMPTE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {formData.typeCompte === "structure" && (
                    <div className="fr-select-group">
                      <label className="fr-label" htmlFor={`${modalId}-structure`}>
                        Structure *
                      </label>
                      <select
                        id={`${modalId}-structure`}
                        className="fr-select"
                        value={formData.structureId}
                        onChange={(e) => setFormData({ ...formData, structureId: e.target.value })}
                        disabled={isLoading}
                        required>
                        <option value="">Sélectionner une structure</option>
                        {structures.map((structure) => (
                          <option
                            key={structure.id}
                            value={structure.id}
                            disabled={!structure.amo && !structure.allersVers}>
                            {structure.nom} ({rolesDeStructure(structure)})
                          </option>
                        ))}
                      </select>
                      {structureChoisie ? (
                        <p className="fr-hint-text">
                          Rôle hérité : {rolesDeStructure(structureChoisie)}.
                          {structureChoisie.amo && ` Dossiers de l'AMO « ${structureChoisie.amo} ».`}
                          {structureChoisie.allersVers &&
                            ` Prospects du territoire de l'Aller-vers « ${structureChoisie.allersVers} ».`}
                        </p>
                      ) : (
                        <p className="fr-hint-text">L&apos;agent obtient les rôles de sa structure.</p>
                      )}
                      {structures.length === 0 && (
                        <p className="fr-error-text">
                          Aucune structure disponible. Importez d&apos;abord une AMO ou une structure Aller-vers.
                        </p>
                      )}
                    </div>
                  )}

                  {/* Départements (pour Administrateur et Analyste) */}
                  {(formData.typeCompte === UserRole.ADMINISTRATEUR || formData.typeCompte === UserRole.ANALYSTE) && (
                    <div className="fr-input-group">
                      <label className="fr-label">Départements autorisés</label>
                      <DepartementsSelect
                        value={formData.departements}
                        onChange={(departements) => setFormData({ ...formData, departements })}
                        disabled={isLoading}
                        placeholder="Sélectionner les départements..."
                      />
                      <p className="fr-hint-text">
                        {formData.typeCompte === UserRole.ANALYSTE
                          ? "Avec un ou plusieurs départements, l'analyste suit les dossiers de ces territoires (mode DDT). Laissez vide pour un accès national aux statistiques."
                          : "L'administrateur n'aura accès qu'aux données de ces départements. Laissez vide pour un accès à tous les départements."}
                      </p>
                    </div>
                  )}

                  <div className="fr-modal__footer fr-mt-4w">
                    <ul className="fr-btns-group fr-btns-group--right fr-btns-group--inline-lg">
                      <li>
                        <button
                          type="button"
                          className="fr-btn fr-btn--secondary"
                          aria-controls={modalId}
                          disabled={isLoading}>
                          Annuler
                        </button>
                      </li>
                      <li>
                        <button type="submit" className="fr-btn" disabled={isLoading}>
                          {isLoading ? "Enregistrement..." : isEditing ? "Modifier" : "Ajouter"}
                        </button>
                      </li>
                    </ul>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </dialog>
  );
}
