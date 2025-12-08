"use client";

import { UserRole } from "@/shared/domain/value-objects";
import { DEPARTEMENTS } from "@/shared/constants/departements.constants";
import { AgentWithPermissions } from "@/features/backoffice";

interface AgentsListProps {
  agents: AgentWithPermissions[];
  onEdit: (agent: AgentWithPermissions) => void;
  onDelete: (agent: AgentWithPermissions) => void;
  isLoading?: boolean;
  modalDeleteId: string;
  modalFormId: string;
}

/**
 * Libellé du rôle pour l'affichage
 */
function getRoleLabel(role: string): string {
  switch (role) {
    case UserRole.SUPER_ADMINISTRATEUR:
      return "Super Admin";
    case UserRole.ADMINISTRATEUR:
      return "Administrateur";
    case UserRole.AMO:
      return "AMO";
    case UserRole.ANALYSTE:
      return "Analyste";
    default:
      return role;
  }
}

/**
 * Couleur du badge selon le rôle
 */
function getRoleBadgeClass(role: string): string {
  switch (role) {
    case UserRole.SUPER_ADMINISTRATEUR:
      return "fr-badge--purple-glycine";
    case UserRole.ADMINISTRATEUR:
      return "fr-badge--green-emeraude";
    case UserRole.AMO:
      return "fr-badge--blue-cumulus";
    case UserRole.ANALYSTE:
      return "fr-badge--orange-safran";
    default:
      return "";
  }
}

export default function AgentsList({
  agents,
  onEdit,
  onDelete,
  isLoading = false,
  modalDeleteId,
  modalFormId,
}: AgentsListProps) {
  if (agents.length === 0) {
    return (
      <div className="fr-callout">
        <p className="fr-callout__text">Aucun agent enregistré pour le moment.</p>
      </div>
    );
  }

  return (
    <div className="fr-table">
      <table>
        <thead>
          <tr>
            <th scope="col">Agent</th>
            <th scope="col">Email</th>
            <th scope="col">Rôle</th>
            <th scope="col">Départements</th>
            <th scope="col">Créé le</th>
            <th scope="col">Actions</th>
          </tr>
        </thead>
        <tbody>
          {agents.map((agentData) => {
            const { agent, departements } = agentData;
            const fullName = [agent.givenName, agent.usualName].filter(Boolean).join(" ");
            const isPending = agent.sub.startsWith("pending_");

            return (
              <tr key={agent.id}>
                {/* Nom */}
                <td>
                  <div className="flex flex-col">
                    <span className="font-medium">{fullName || "-"}</span>
                    {isPending && <span className="text-xs text-orange-600">En attente de connexion</span>}
                  </div>
                </td>

                {/* Email */}
                <td>
                  <a href={`mailto:${agent.email}`} className="fr-link">
                    {agent.email}
                  </a>
                </td>

                {/* Rôle */}
                <td>
                  <span className={`fr-badge fr-badge--sm fr-badge--no-icon ${getRoleBadgeClass(agent.role)}`}>
                    {getRoleLabel(agent.role)}
                  </span>
                </td>

                {/* Départements */}
                <td>
                  {agent.role === UserRole.SUPER_ADMINISTRATEUR ? (
                    <span className="text-sm text-gray-500">Tous</span>
                  ) : departements.length === 0 ? (
                    <span className="text-sm text-gray-500">Tous</span>
                  ) : (
                    <div className="flex flex-wrap gap-1">
                      {departements.slice(0, 3).map((code) => (
                        <span key={code} className="fr-badge fr-badge--sm fr-badge--no-icon" title={DEPARTEMENTS[code]}>
                          {code}
                        </span>
                      ))}
                      {departements.length > 3 && (
                        <span
                          className="fr-badge fr-badge--sm fr-badge--no-icon"
                          title={departements
                            .slice(3)
                            .map((c) => `${c} - ${DEPARTEMENTS[c]}`)
                            .join(", ")}>
                          +{departements.length - 3}
                        </span>
                      )}
                    </div>
                  )}
                </td>

                {/* Date création */}
                <td>
                  <span className="text-sm">{new Date(agent.createdAt).toLocaleDateString("fr-FR")}</span>
                </td>

                {/* Actions */}
                <td>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="fr-btn fr-btn--sm fr-btn--secondary"
                      aria-controls={modalFormId}
                      data-fr-opened="false"
                      onClick={() => onEdit(agentData)}
                      disabled={isLoading}
                      title="Modifier">
                      <span className="fr-icon-edit-line fr-icon--sm" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      className="fr-btn fr-btn--sm fr-btn--tertiary-no-outline text-red-600"
                      aria-controls={modalDeleteId}
                      data-fr-opened="false"
                      onClick={() => onDelete(agentData)}
                      disabled={isLoading}
                      title="Supprimer">
                      <span className="fr-icon-delete-line fr-icon--sm" aria-hidden="true" />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
