"use client";

import { useState, useEffect } from "react";
import { UserRole } from "@/shared/domain/value-objects";
import type { AgentRole } from "@/shared/domain/value-objects";
import DepartementsSelect from "./DepartementsSelect";
import type { AgentWithPermissions } from "@/features/backoffice/administration/domain/types";

interface AgentFormModalProps {
  modalId: string;
  onSubmit: (data: AgentFormData) => Promise<void>;
  agent?: AgentWithPermissions | null;
  isLoading?: boolean;
}

export interface AgentFormData {
  email: string;
  givenName: string;
  usualName?: string;
  role: AgentRole;
  departements: string[];
}

const ROLE_OPTIONS: { value: AgentRole; label: string }[] = [
  { value: UserRole.SUPER_ADMINISTRATEUR, label: "Super Administrateur" },
  { value: UserRole.ADMINISTRATEUR, label: "Administrateur" },
  { value: UserRole.AMO, label: "AMO" },
  { value: UserRole.ANALYSTE, label: "Analyste" },
];

export default function AgentFormModal({ modalId, onSubmit, agent, isLoading = false }: AgentFormModalProps) {
  const isEditing = !!agent;

  const [formData, setFormData] = useState<AgentFormData>({
    email: "",
    givenName: "",
    usualName: "",
    role: UserRole.ADMINISTRATEUR,
    departements: [],
  });

  const [error, setError] = useState<string | null>(null);

  // Initialiser le formulaire avec les données de l'agent en mode édition
  useEffect(() => {
    if (agent) {
      setFormData({
        email: agent.agent.email,
        givenName: agent.agent.givenName,
        usualName: agent.agent.usualName || "",
        role: agent.agent.role as AgentRole,
        departements: agent.departements,
      });
    } else {
      setFormData({
        email: "",
        givenName: "",
        usualName: "",
        role: UserRole.ADMINISTRATEUR,
        departements: [],
      });
    }
    setError(null);
  }, [agent]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!formData.email || !formData.email.includes("@")) {
      setError("Email invalide");
      return;
    }

    if (!formData.givenName.trim()) {
      setError("Le prénom est requis");
      return;
    }

    try {
      await onSubmit(formData);

      // Fermer la modale via l'API DSFR
      const modal = document.getElementById(modalId);
      if (modal && window.dsfr) {
        window.dsfr(modal).modal.conceal();
      }

      // Reset le formulaire après succès
      setFormData({
        email: "",
        givenName: "",
        usualName: "",
        role: UserRole.ADMINISTRATEUR,
        departements: [],
      });
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
                    <p className="fr-hint-text">L'agent pourra se connecter avec cet email via ProConnect</p>
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

                  {/* Rôle */}
                  <div className="fr-select-group">
                    <label className="fr-label" htmlFor={`${modalId}-role`}>
                      Rôle *
                    </label>
                    <select
                      id={`${modalId}-role`}
                      className="fr-select"
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value as AgentRole })}
                      disabled={isLoading}
                      required>
                      {ROLE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Départements (uniquement pour Administrateur) */}
                  {formData.role === UserRole.ADMINISTRATEUR && (
                    <div className="fr-input-group">
                      <label className="fr-label">Départements autorisés</label>
                      <DepartementsSelect
                        value={formData.departements}
                        onChange={(departements) => setFormData({ ...formData, departements })}
                        disabled={isLoading}
                        placeholder="Sélectionner les départements..."
                      />
                      <p className="fr-hint-text">
                        L'administrateur n'aura accès qu'aux données de ces départements. Laissez vide pour un accès à
                        tous les départements.
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
