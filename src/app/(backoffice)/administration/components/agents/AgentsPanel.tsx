"use client";

import { useState, useEffect, useCallback } from "react";
import {
  getAgentsAction,
  createAgentAction,
  updateAgentAction,
  deleteAgentAction,
} from "@/features/backoffice/administration/actions/agents.actions";
import type { AgentWithPermissions } from "@/features/backoffice/administration/services/agents-admin.service";
import AgentsList from "./AgentsList";
import AgentFormModal, { type AgentFormData } from "./AgentFormModal";
import AgentDeleteModal from "./AgentDeleteModal";

export default function AgentsPanel() {
  const [agents, setAgents] = useState<AgentWithPermissions[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal states
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<AgentWithPermissions | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Charger les agents
  const loadAgents = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const result = await getAgentsAction();

    if (result.success) {
      setAgents(result.data);
    } else {
      setError(result.error || "Erreur lors du chargement des agents");
    }

    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadAgents();
  }, [loadAgents]);

  // Ouvrir le modal d'ajout
  const handleAdd = () => {
    setSelectedAgent(null);
    setIsFormModalOpen(true);
  };

  // Ouvrir le modal d'édition
  const handleEdit = (agent: AgentWithPermissions) => {
    setSelectedAgent(agent);
    setIsFormModalOpen(true);
  };

  // Ouvrir le modal de suppression
  const handleDelete = (agent: AgentWithPermissions) => {
    setSelectedAgent(agent);
    setIsDeleteModalOpen(true);
  };

  // Soumettre le formulaire (création ou modification)
  const handleFormSubmit = async (data: AgentFormData) => {
    setIsSubmitting(true);

    try {
      let result;

      if (selectedAgent) {
        // Mode édition
        result = await updateAgentAction(selectedAgent.agent.id, {
          email: data.email,
          givenName: data.givenName,
          usualName: data.usualName || undefined,
          role: data.role,
          departements: data.departements,
        });
      } else {
        // Mode création
        result = await createAgentAction({
          email: data.email,
          givenName: data.givenName,
          usualName: data.usualName || undefined,
          role: data.role,
          departements: data.departements,
        });
      }

      if (!result.success) {
        throw new Error(result.error);
      }

      // Recharger la liste
      await loadAgents();
      setIsFormModalOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Confirmer la suppression
  const handleDeleteConfirm = async () => {
    if (!selectedAgent) return;

    setIsSubmitting(true);

    try {
      const result = await deleteAgentAction(selectedAgent.agent.id);

      if (!result.success) {
        throw new Error(result.error);
      }

      // Recharger la liste
      await loadAgents();
      setIsDeleteModalOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold mb-1">Gestion des agents</h2>
          <p className="text-gray-600">Gérez les agents qui ont accès au backoffice et leurs permissions.</p>
        </div>
        <button type="button" className="fr-btn" onClick={handleAdd}>
          <span className="fr-icon-add-line fr-icon--sm mr-2" aria-hidden="true" />
          Ajouter un agent
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="fr-alert fr-alert--error mb-4">
          <p>{error}</p>
        </div>
      )}

      {/* Loading */}
      {isLoading ? (
        <div className="flex justify-center items-center py-12">
          <div className="text-gray-500">Chargement des agents...</div>
        </div>
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="fr-card fr-card--no-border p-4 bg-gray-50">
              <div className="text-3xl font-bold">{agents.length}</div>
              <div className="text-sm text-gray-600">Agents total</div>
            </div>
            <div className="fr-card fr-card--no-border p-4 bg-gray-50">
              <div className="text-3xl font-bold">
                {agents.filter((a) => a.agent.role === "super_administrateur").length}
              </div>
              <div className="text-sm text-gray-600">Super Admins</div>
            </div>
            <div className="fr-card fr-card--no-border p-4 bg-gray-50">
              <div className="text-3xl font-bold">
                {agents.filter((a) => a.agent.sub.startsWith("pending_")).length}
              </div>
              <div className="text-sm text-gray-600">En attente de connexion</div>
            </div>
          </div>

          {/* Liste */}
          <AgentsList agents={agents} onEdit={handleEdit} onDelete={handleDelete} isLoading={isSubmitting} />
        </>
      )}

      {/* Modals */}
      <AgentFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        onSubmit={handleFormSubmit}
        agent={selectedAgent}
        isLoading={isSubmitting}
      />

      <AgentDeleteModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteConfirm}
        agent={selectedAgent}
        isLoading={isSubmitting}
      />
    </div>
  );
}
