"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import AgentsList from "./AgentsList";
import AgentsEmailExport from "./AgentsEmailExport";
import AgentFormModal, { type AgentFormData, type EntrepriseAmoOption, type AllersVersOption } from "./AgentFormModal";
import AgentDeleteModal from "./AgentDeleteModal";
import AgentDesactiverModal from "./AgentDesactiverModal";
import {
  AgentWithPermissions,
  createAgentAction,
  deleteAgentAction,
  desactiverAgentAction,
  getAgentsAction,
  getAgentTracesAction,
  getAgentListesDiffusionAction,
  reactiverAgentAction,
  updateAgentAction,
} from "@/features/backoffice";
import type { AgentTracesCount } from "@/shared/database/repositories/agents.repository";
import type { ListeDiffusion } from "@/features/backoffice/administration/agents/services/listes-diffusion.service";
import { getEntreprisesAmoOptions } from "@/features/backoffice/administration/amo/actions";
import { getAllersVersOptions } from "@/features/backoffice/administration/allers-vers/actions/allers-vers-admin.actions";
import { UserRole } from "@/shared/domain/value-objects";
import { AdminBreadcrumb } from "../../shared/components/AdminBreadcrumb";

const MODAL_DELETE_ID = "modal-delete-agent";
const MODAL_DESACTIVER_ID = "modal-desactiver-agent";
const MODAL_FORM_ID = "modal-form-agent";

/** Filtre de statut, appliqué avant la répartition par rôle. */
const STATUT_FILTERS = [
  { id: "actifs", label: "Actifs" },
  { id: "desactives", label: "Désactivés" },
  { id: "tous", label: "Tous" },
] as const;

type StatutFilter = (typeof STATUT_FILTERS)[number]["id"];

/** Compte rendu de l'effet de la désactivation sur les listes de diffusion. */
function buildDesactivationNotice(resume: { listesRetirees: string[]; listesConservees: string[] }): string {
  const phrases = ["Agent désactivé."];

  if (resume.listesRetirees.length > 0) {
    phrases.push(`Adresse retirée de la liste de diffusion de ${resume.listesRetirees.join(", ")}.`);
  }
  if (resume.listesConservees.length > 0) {
    phrases.push(
      `Adresse conservée dans ${resume.listesConservees.join(", ")} : c'était la dernière de la structure, ajoutez un remplaçant avant de la retirer.`
    );
  }
  if (resume.listesRetirees.length === 0 && resume.listesConservees.length === 0) {
    phrases.push("Son adresse ne figurait dans aucune liste de diffusion.");
  }

  return phrases.join(" ");
}

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
];

export default function AgentsPanel() {
  const [agents, setAgents] = useState<AgentWithPermissions[]>([]);
  const [entreprisesAmo, setEntreprisesAmo] = useState<EntrepriseAmoOption[]>([]);
  const [allersVersList, setAllersVersList] = useState<AllersVersOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("tous");
  const [statutFilter, setStatutFilter] = useState<StatutFilter>("actifs");

  // Modal states
  const [selectedAgent, setSelectedAgent] = useState<AgentWithPermissions | null>(null);
  const [traces, setTraces] = useState<AgentTracesCount | null>(null);
  const [listes, setListes] = useState<ListeDiffusion[] | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const nbDesactives = useMemo(() => agents.filter((a) => a.agent.desactiveAt).length, [agents]);

  // Le filtre de statut s'applique avant la répartition par rôle : les compteurs
  // d'onglets reflètent donc ce que la table affiche réellement.
  const agentsFiltres = useMemo(() => {
    if (statutFilter === "actifs") return agents.filter((a) => !a.agent.desactiveAt);
    if (statutFilter === "desactives") return agents.filter((a) => a.agent.desactiveAt);
    return agents;
  }, [agents, statutFilter]);

  // Compter les agents par onglet
  const agentsByTab = useMemo(() => {
    const counts: Record<string, AgentWithPermissions[]> = {};
    for (const tab of ROLE_TABS) {
      if (tab.roles.length === 0) {
        counts[tab.id] = agentsFiltres;
      } else {
        counts[tab.id] = agentsFiltres.filter((a) => tab.roles.includes(a.agent.role));
      }
    }
    return counts;
  }, [agentsFiltres]);

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

  // Ouvrir le modal de suppression : on compte d'abord l'historique, c'est lui qui
  // décide si la modale propose la suppression ou bascule sur la désactivation.
  const handleDelete = async (agent: AgentWithPermissions) => {
    setSelectedAgent(agent);
    setTraces(null);
    setListes(null);
    setNotice(null);

    const [tracesResult, listesResult] = await Promise.all([
      getAgentTracesAction(agent.agent.id),
      getAgentListesDiffusionAction(agent.agent.id),
    ]);

    if (tracesResult.success) {
      setTraces(tracesResult.data);
    } else {
      setError(tracesResult.error || "Impossible de vérifier l'historique de l'agent");
    }

    if (listesResult.success) setListes(listesResult.data);
  };

  // Ouvrir le modal de désactivation
  const handleDesactiver = async (agent: AgentWithPermissions) => {
    setSelectedAgent(agent);
    setListes(null);
    setNotice(null);

    const result = await getAgentListesDiffusionAction(agent.agent.id);
    if (result.success) setListes(result.data);
  };

  const handleDesactiverConfirm = async (raison: string) => {
    if (!selectedAgent) return;

    setIsSubmitting(true);
    setError(null);
    setNotice(null);

    try {
      const result = await desactiverAgentAction(selectedAgent.agent.id, raison);

      if (!result.success) {
        setError(result.error || "Erreur lors de la désactivation");
        return;
      }

      setNotice(buildDesactivationNotice(result.data));
      await loadData();
    } finally {
      setIsSubmitting(false);
    }
  };

  // Réactivation : pas de modale, l'action est sans effet de bord et réversible.
  const handleReactiver = async (agent: AgentWithPermissions) => {
    setIsSubmitting(true);
    setError(null);
    setNotice(null);

    try {
      const result = await reactiverAgentAction(agent.agent.id);

      if (!result.success) {
        setError(result.error || "Erreur lors de la réactivation");
        return;
      }

      // La réactivation ne réinjecte pas l'adresse : ces listes sont éditoriales.
      setNotice(
        "Agent réactivé. Son adresse n'a pas été remise dans les listes de diffusion : ajoutez-la depuis la fiche de la structure si besoin."
      );
      await loadData();
    } finally {
      setIsSubmitting(false);
    }
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

  // Confirmer la suppression. Le refus « agent avec historique » remonte du serveur
  // même si l'UI a déjà basculé : c'est lui la barrière.
  const handleDeleteConfirm = async () => {
    if (!selectedAgent) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const result = await deleteAgentAction(selectedAgent.agent.id);

      if (!result.success) {
        setError(result.error || "Erreur lors de la suppression");
        return;
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
            <div className="fr-alert fr-alert--error fr-mb-2w">
              <p>{error}</p>
            </div>
          )}

          {/* Compte rendu de la dernière (dés)activation */}
          {notice && (
            <div className="fr-alert fr-alert--success fr-mb-2w">
              <p>{notice}</p>
            </div>
          )}

          {/* Filtre de statut */}
          <fieldset className="fr-segmented fr-segmented--sm fr-mb-3w">
            <legend className="fr-segmented__legend fr-sr-only">Filtrer les agents par statut</legend>
            <div className="fr-segmented__elements">
              {STATUT_FILTERS.map((filtre) => (
                <div key={filtre.id} className="fr-segmented__element">
                  <input
                    value={filtre.id}
                    checked={statutFilter === filtre.id}
                    type="radio"
                    id={`segmented-statut-${filtre.id}`}
                    name="segmented-statut-agents"
                    onChange={() => setStatutFilter(filtre.id)}
                  />
                  <label className="fr-label" htmlFor={`segmented-statut-${filtre.id}`}>
                    {filtre.label}
                    {filtre.id === "desactives" && nbDesactives > 0 ? ` (${nbDesactives})` : ""}
                  </label>
                </div>
              ))}
            </div>
          </fieldset>

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
              <AgentsEmailExport
                agents={agentsByTab[activeTab] ?? []}
                tabLabel={ROLE_TABS.find((tab) => tab.id === activeTab)?.label ?? "Tous"}
              />
              <AgentsList
                agents={agentsByTab[activeTab] ?? []}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onDesactiver={handleDesactiver}
                onReactiver={handleReactiver}
                isLoading={isSubmitting}
                modalDeleteId={MODAL_DELETE_ID}
                modalDesactiverId={MODAL_DESACTIVER_ID}
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
        onDesactiver={handleDesactiverConfirm}
        agent={selectedAgent}
        traces={traces}
        listes={listes}
        isLoading={isSubmitting}
      />

      <AgentDesactiverModal
        modalId={MODAL_DESACTIVER_ID}
        onConfirm={handleDesactiverConfirm}
        agent={selectedAgent}
        listes={listes}
        isLoading={isSubmitting}
      />
    </>
  );
}
