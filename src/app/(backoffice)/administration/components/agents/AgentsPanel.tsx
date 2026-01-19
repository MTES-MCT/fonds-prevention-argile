"use client";

import { useState, useEffect, useCallback } from "react";
import AgentsList from "./AgentsList";
import AgentFormModal, { type AgentFormData, type EntrepriseAmoOption } from "./AgentFormModal";
import AgentDeleteModal from "./AgentDeleteModal";
import {
  AgentWithPermissions,
  createAgentAction,
  deleteAgentAction,
  getAgentsAction,
  updateAgentAction,
} from "@/features/backoffice";
import { getEntreprisesAmoOptions } from "@/features/backoffice/administration/gestion-amo/actions";
import StatCard from "../shared/StatCard";

const MODAL_DELETE_ID = "modal-delete-agent";
const MODAL_FORM_ID = "modal-form-agent";

export default function AgentsPanel() {
  const [agents, setAgents] = useState<AgentWithPermissions[]>([]);
  const [entreprisesAmo, setEntreprisesAmo] = useState<EntrepriseAmoOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal states
  const [selectedAgent, setSelectedAgent] = useState<AgentWithPermissions | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Charger les agents et les entreprises AMO
  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const [agentsResult, entreprisesResult] = await Promise.all([getAgentsAction(), getEntreprisesAmoOptions()]);

    if (agentsResult.success) {
      setAgents(agentsResult.data);
    } else {
      setError(agentsResult.error || "Erreur lors du chargement des agents");
    }

    if (entreprisesResult.success) {
      setEntreprisesAmo(entreprisesResult.data);
    }

    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Ouvrir le modal d'ajout
  const handleAdd = () => {
    setSelectedAgent(null);
  };

  // Ouvrir le modal d'édition
  const handleEdit = (agent: AgentWithPermissions) => {
    setSelectedAgent(agent);
  };

  // Ouvrir le modal de suppression
  const handleDelete = (agent: AgentWithPermissions) => {
    setSelectedAgent(agent);
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
          entrepriseAmoId: data.entrepriseAmoId,
        });
      } else {
        // Mode création
        result = await createAgentAction({
          email: data.email,
          givenName: data.givenName,
          usualName: data.usualName || undefined,
          role: data.role,
          departements: data.departements,
          entrepriseAmoId: data.entrepriseAmoId,
        });
      }

      if (!result.success) {
        throw new Error(result.error);
      }

      // Recharger la liste
      await loadData();
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
      await loadData();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          {/* En-tête */}
          <div className="fr-mb-6w">
            <h1 className="fr-h2 fr-mb-2w">Gestion des agents</h1>
            <p className="fr-text--lg fr-text-mention--grey">
              Gérez les agents ayant accès au backoffice et leurs permissions.
            </p>
          </div>
        </div>
        <button
          type="button"
          className="fr-btn"
          aria-controls={MODAL_FORM_ID}
          data-fr-opened="false"
          onClick={handleAdd}>
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
          <div className="fr-grid-row fr-grid-row--gutters fr-mb-4w">
            <StatCard label="Agents total" number={agents.length.toString()} />
            <StatCard
              label="Super Admins"
              number={agents.filter((a) => a.agent.role === "super_administrateur").length.toString()}
            />
            <StatCard label="AMO" number={agents.filter((a) => a.agent.role === "amo").length.toString()} />
            <StatCard
              label="En attente de connexion"
              number={agents.filter((a) => a.agent.sub.startsWith("pending_")).length.toString()}
            />
          </div>

          {/* Liste */}
          <AgentsList
            agents={agents}
            onEdit={handleEdit}
            onDelete={handleDelete}
            isLoading={isSubmitting}
            modalDeleteId={MODAL_DELETE_ID}
            modalFormId={MODAL_FORM_ID}
          />
        </>
      )}

      {/* Modals */}
      <AgentFormModal
        modalId={MODAL_FORM_ID}
        onSubmit={handleFormSubmit}
        agent={selectedAgent}
        isLoading={isSubmitting}
        entreprisesAmo={entreprisesAmo}
      />

      <AgentDeleteModal
        modalId={MODAL_DELETE_ID}
        onConfirm={handleDeleteConfirm}
        agent={selectedAgent}
        isLoading={isSubmitting}
      />
    </div>
  );
}
