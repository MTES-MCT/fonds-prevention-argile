"use client";

import { useState, useEffect } from "react";
import { UserRole } from "@/shared/domain/value-objects";
import type { AgentRole } from "@/shared/domain/value-objects";
import DepartementsSelect from "./DepartementsSelect";
import { AgentWithPermissions } from "@/features/backoffice";

/**
 * Entreprise AMO simplifiée pour le select
 */
export interface EntrepriseAmoOption {
  id: string;
  nom: string;
  siret: string;
}

interface AgentFormModalProps {
  modalId: string;
  onSubmit: (data: AgentFormData) => Promise<void>;
  agent?: AgentWithPermissions | null;
  isLoading?: boolean;
  entreprisesAmo: EntrepriseAmoOption[];
}

export interface AgentFormData {
  email: string;
  givenName: string;
  usualName?: string;
  role: AgentRole;
  departements: string[];
  entrepriseAmoId?: string;
}

const ROLE_OPTIONS: { value: AgentRole; label: string }[] = [
  { value: UserRole.SUPER_ADMINISTRATEUR, label: "Super Administrateur" },
  { value: UserRole.ADMINISTRATEUR, label: "Administrateur" },
  { value: UserRole.AMO, label: "AMO" },
  { value: UserRole.ANALYSTE, label: "Analyste" },
];

export default function AgentFormModal({
  modalId,
  onSubmit,
  agent,
  isLoading = false,
  entreprisesAmo,
}: AgentFormModalProps) {
  const isEditing = !!agent;

  const [formData, setFormData] = useState<AgentFormData>({
    email: "",
    givenName: "",
    usualName: "",
    role: UserRole.ADMINISTRATEUR,
    departements: [],
    entrepriseAmoId: undefined,
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
        entrepriseAmoId: agent.agent.entrepriseAmoId || undefined,
      });
    } else {
      setFormData({
        email: "",
        givenName: "",
        usualName: "",
        role: UserRole.ADMINISTRATEUR,
        departements: [],
        entrepriseAmoId: undefined,
      });
    }
    setError(null);
  }, [agent]);

  // Reset entrepriseAmoId quand on change de rôle (sauf vers AMO)
  const handleRoleChange = (newRole: AgentRole) => {
    setFormData((prev) => ({
      ...prev,
      role: newRole,
      // Reset l'entreprise AMO si on quitte le rôle AMO
      entrepriseAmoId: newRole === UserRole.AMO ? prev.entrepriseAmoId : undefined,
      // Reset les départements si on quitte le rôle Administrateur
      departements: newRole === UserRole.ADMINISTRATEUR ? prev.departements : [],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation email
    if (!formData.email || !formData.email.includes("@")) {
      setError("Email invalide");
      return;
    }

    // Validation prénom
    if (!formData.givenName.trim()) {
      setError("Le prénom est requis");
      return;
    }

    // Validation entreprise AMO si rôle = AMO
    if (formData.role === UserRole.AMO && !formData.entrepriseAmoId) {
      setError("Une entreprise AMO doit être sélectionnée pour un agent AMO");
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
        entrepriseAmoId: undefined,
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

                  {/* Rôle */}
                  <div className="fr-select-group">
                    <label className="fr-label" htmlFor={`${modalId}-role`}>
                      Rôle *
                    </label>
                    <select
                      id={`${modalId}-role`}
                      className="fr-select"
                      value={formData.role}
                      onChange={(e) => handleRoleChange(e.target.value as AgentRole)}
                      disabled={isLoading}
                      required>
                      {ROLE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Entreprise AMO (uniquement pour le rôle AMO) */}
                  {formData.role === UserRole.AMO && (
                    <div className="fr-select-group">
                      <label className="fr-label" htmlFor={`${modalId}-entrepriseAmo`}>
                        Entreprise AMO *
                      </label>
                      <select
                        id={`${modalId}-entrepriseAmo`}
                        className="fr-select"
                        value={formData.entrepriseAmoId || ""}
                        onChange={(e) => setFormData({ ...formData, entrepriseAmoId: e.target.value || undefined })}
                        disabled={isLoading}
                        required>
                        <option value="">Sélectionner une entreprise AMO</option>
                        {entreprisesAmo.map((entreprise) => (
                          <option key={entreprise.id} value={entreprise.id}>
                            {entreprise.nom} ({entreprise.siret})
                          </option>
                        ))}
                      </select>
                      <p className="fr-hint-text">
                        L&apos;agent AMO aura accès uniquement aux dossiers associés à cette entreprise
                      </p>
                      {entreprisesAmo.length === 0 && (
                        <p className="fr-error-text">
                          Aucune entreprise AMO disponible. Veuillez d&apos;abord créer une entreprise AMO.
                        </p>
                      )}
                    </div>
                  )}

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
                        L&apos;administrateur n&apos;aura accès qu&apos;aux données de ces départements. Laissez vide
                        pour un accès à tous les départements.
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
