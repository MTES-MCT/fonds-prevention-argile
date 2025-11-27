"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { UserRole } from "@/shared/domain/value-objects";
import type { AgentRole } from "@/shared/domain/value-objects";
import DepartementsSelect from "./DepartementsSelect";
import { AgentWithPermissions } from "@/features/backoffice";

interface AgentFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: AgentFormData) => Promise<void>;
  agent?: AgentWithPermissions | null; // Si fourni, mode édition
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
];

export default function AgentFormModal({ isOpen, onClose, onSubmit, agent, isLoading = false }: AgentFormModalProps) {
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
  }, [agent, isOpen]);

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
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue");
    }
  };

  if (!isOpen) return null;

  const modalContent = (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black bg-opacity-50" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-bold">{isEditing ? "Modifier l'agent" : "Ajouter un agent"}</h2>
          <button type="button" onClick={onClose} className="text-gray-500 hover:text-gray-700" disabled={isLoading}>
            <span className="fr-icon-close-line" aria-hidden="true" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {error && (
            <div className="fr-alert fr-alert--error fr-alert--sm">
              <p>{error}</p>
            </div>
          )}

          {/* Email */}
          <div className="fr-input-group">
            <label className="fr-label" htmlFor="agent-email">
              Email *
            </label>
            <input
              type="email"
              id="agent-email"
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
            <label className="fr-label" htmlFor="agent-givenName">
              Prénom *
            </label>
            <input
              type="text"
              id="agent-givenName"
              className="fr-input"
              value={formData.givenName}
              onChange={(e) => setFormData({ ...formData, givenName: e.target.value })}
              disabled={isLoading}
              required
            />
          </div>

          {/* Nom */}
          <div className="fr-input-group">
            <label className="fr-label" htmlFor="agent-usualName">
              Nom
            </label>
            <input
              type="text"
              id="agent-usualName"
              className="fr-input"
              value={formData.usualName}
              onChange={(e) => setFormData({ ...formData, usualName: e.target.value })}
              disabled={isLoading}
            />
          </div>

          {/* Rôle */}
          <div className="fr-select-group">
            <label className="fr-label" htmlFor="agent-role">
              Rôle *
            </label>
            <select
              id="agent-role"
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
                L'administrateur n'aura accès qu'aux données de ces départements. Laissez vide pour un accès à tous les
                départements.
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <button type="button" className="fr-btn fr-btn--secondary" onClick={onClose} disabled={isLoading}>
              Annuler
            </button>
            <button type="submit" className="fr-btn" disabled={isLoading}>
              {isLoading ? "Enregistrement..." : isEditing ? "Modifier" : "Ajouter"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  // Utiliser un portal pour rendre le modal au niveau du body
  if (typeof window === "undefined") return null;
  return createPortal(modalContent, document.body);
}
