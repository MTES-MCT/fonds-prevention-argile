"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import AgentsList from "./AgentsList";
import AgentFormModal, { type AgentFormData, type EntrepriseAmoOption, type AllersVersOption } from "./AgentFormModal";
import AgentDeleteModal from "./AgentDeleteModal";
import {
  AgentWithPermissions,
  createAgentAction,
  deleteAgentAction,
  getAgentsAction,
  updateAgentAction,
} from "@/features/backoffice";
import { getEntreprisesAmoOptions } from "@/features/backoffice/administration/amo/actions";
import { getAllersVersOptions } from "@/features/backoffice/administration/allers-vers/actions/allers-vers-admin.actions";
import { UserRole } from "@/shared/domain/value-objects";
import { AdminBreadcrumb } from "../../shared/components/AdminBreadcrumb";

const MODAL_DELETE_ID = "modal-delete-agent";
const MODAL_FORM_ID = "modal-form-agent";

/** Definition d'un onglet de role */
interface RoleTab {
  id: string;
  label: string;
  /** Roles inclus dans cet onglet */
  roles: string[];
  badgeClass: string;
}

const ROLE_TABS: RoleTab[] = [
  {
    id: "tous",
    label: "Tous",
    roles: [],
    badgeClass: "fr-badge--blue-cumulus",
  },
  {
    id: "super-admin",
    label: "Super Admin",
    roles: [UserRole.SUPER_ADMINISTRATEUR],
    badgeClass: "fr-badge--purple-glycine",
  },
  {
    id: "administrateur",
    label: "Administrateur",
    roles: [UserRole.ADMINISTRATEUR],
    badgeClass: "fr-badge--green-emeraude",
  },
  {
    id: "amo",
    label: "AMO",
    roles: [UserRole.AMO, UserRole.AMO_ET_ALLERS_VERS],
    badgeClass: "fr-badge--blue-cumulus",
  },
  {
    id: "allers-vers",
    label: "Allers-Vers",
    roles: [UserRole.ALLERS_VERS, UserRole.AMO_ET_ALLERS_VERS],
    badgeClass: "fr-badge--yellow-tournesol",
  },
  {
    id: "analyste",
    label: "Analyste",
    roles: [UserRole.ANALYSTE],
    badgeClass: "fr-badge--orange-safran",
  },
  {
    id: "analyste-ddt",
    label: "Analyste DDT",
    roles: [UserRole.ANALYSTE_DDT],
    badgeClass: "fr-badge--orange-safran",
  },
];

export default function AgentsPanel() {
  const [agents, setAgents] = useState<AgentWithPermissions[]>([]);
  const [entreprisesAmo, setEntreprisesAmo] = useState<EntrepriseAmoOption[]>([]);
  const [allersVersList, setAllersVersList] = useState<AllersVersOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("tous");

  // Modal states
  const [selectedAgent, setSelectedAgent] = useState<AgentWithPermissions | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Compter les agents par onglet
  const agentsByTab = useMemo(() => {
    const counts: Record<string, AgentWithPermissions[]> = {};
    for (const tab of ROLE_TABS) {
      if (tab.roles.length === 0) {
        counts[tab.id] = agents;
      } else {
        counts[tab.id] = agents.filter((a) => tab.roles.includes(a.agent.role));
      }
    }
    return counts;
  }, [agents]);

  // Charger les agents, les entreprises AMO et les territoires Allers-Vers
  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const [agentsResult, entreprisesResult, allersVersResult] = await Promise.all([
      getAgentsAction(),
      getEntreprisesAmoOptions(),
      getAllersVersOptions(),
    ]);

    if (agentsResult.success) {
      setAgents(agentsResult.data);
    } else {
      setError(agentsResult.error || "Erreur lors du chargement des agents");
    }

    if (entreprisesResult.success) {
      setEntreprisesAmo(entreprisesResult.data);
    }

    if (allersVersResult.success) {
      setAllersVersList(allersVersResult.data);
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
        result = await updateAgentAction(selectedAgent.agent.id, {
          email: data.email,
          givenName: data.givenName,
          usualName: data.usualName || undefined,
          role: data.role,
          departements: data.departements,
          entrepriseAmoId: data.entrepriseAmoId,
          allersVersId: data.allersVersId,
        });
      } else {
        result = await createAgentAction({
          email: data.email,
          givenName: data.givenName,
          usualName: data.usualName || undefined,
          role: data.role,
          departements: data.departements,
          entrepriseAmoId: data.entrepriseAmoId,
          allersVersId: data.allersVersId,
        });
      }

      if (!result.success) {
        throw new Error(result.error);
      }

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

      await loadData();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {/* En-tete + onglets — fond blanc */}
      <section className="fr-container-fluid fr-pt-4w" style={{ borderBottom: "1px solid var(--border-default-grey)" }}>
        <div className="fr-container">
          <AdminBreadcrumb currentPageLabel="Gestion des agents" />
          <div className="fr-grid-row fr-grid-row--middle fr-mb-6w">
            <div className="fr-col">
              <h1 className="fr-h2 fr-mb-1v">Gestion des agents</h1>
              <p style={{ color: "var(--text-mention-grey)", marginBottom: 0 }}>
                Gérez les agents ayant accès au backoffice et leurs permissions.
              </p>
            </div>
            <div className="fr-col-auto">
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
          </div>

          {/* Erreur */}
          {error && (
            <div className="fr-alert fr-alert--error">
              <p>{error}</p>
            </div>
          )}

          {/* Onglets par rôle */}
          <div className="fr-tabs" style={{ borderBottom: "none" }}>
            <ul className="fr-tabs__list" role="tablist" aria-label="Agents par rôle">
              {ROLE_TABS.map((tab) => (
                <li key={tab.id} role="presentation">
                  <button
                    type="button"
                    className="fr-tabs__tab"
                    tabIndex={activeTab === tab.id ? 0 : -1}
                    role="tab"
                    aria-selected={activeTab === tab.id}
                    aria-controls={`tab-agents-${tab.id}-panel`}
                    onClick={() => setActiveTab(tab.id)}>
                    <p className={`fr-badge fr-badge--sm fr-badge--no-icon fr-mr-2v ${tab.badgeClass}`}>
                      {agentsByTab[tab.id]?.length ?? 0}
                    </p>
                    {tab.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Contenu — fond bleu */}
      <section className="fr-container-fluid fr-py-4w bg-(--background-alt-blue-france)">
        <div className="fr-container">
          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <div className="text-gray-500">Chargement des agents...</div>
            </div>
          ) : (
            <div id={`tab-agents-${activeTab}-panel`} role="tabpanel">
              <AgentsList
                agents={agentsByTab[activeTab] ?? []}
                onEdit={handleEdit}
                onDelete={handleDelete}
                isLoading={isSubmitting}
                modalDeleteId={MODAL_DELETE_ID}
                modalFormId={MODAL_FORM_ID}
              />
            </div>
          )}
        </div>
      </section>

      {/* Modals */}
      <AgentFormModal
        modalId={MODAL_FORM_ID}
        onSubmit={handleFormSubmit}
        agent={selectedAgent}
        isLoading={isSubmitting}
        entreprisesAmo={entreprisesAmo}
        allersVersList={allersVersList}
      />

      <AgentDeleteModal
        modalId={MODAL_DELETE_ID}
        onConfirm={handleDeleteConfirm}
        agent={selectedAgent}
        isLoading={isSubmitting}
      />
    </>
  );
}
