import { cache } from "react";
import { notFound, redirect } from "next/navigation";
import { checkProConnectAccess } from "@/features/auth/permissions/services/permissions.service";
import { AccessErrorCode } from "@/features/auth/permissions/domain/value-objects/constants";
import { ROUTES } from "@/features/auth/domain/value-objects/configs/routes.config";
import { getCurrentAgent } from "@/features/backoffice/shared/actions/agent.actions";
import { agentPermissionsRepository } from "@/shared/database/repositories/agent-permissions.repository";
import { UserRole } from "@/shared/domain/value-objects/user-role.enum";
import type { Agent } from "@/shared/database/schema/agents";

export const ROLES_ESPACE_AGENT: readonly UserRole[] = [
  UserRole.AMO,
  UserRole.ALLERS_VERS,
  UserRole.AMO_ET_ALLERS_VERS,
  UserRole.ANALYSTE,
  UserRole.SUPER_ADMINISTRATEUR,
];

export type AccesEspaceAgent =
  | { statut: "autorise"; agent: Agent }
  | { statut: "non_connecte" }
  | { statut: "methode_invalide" }
  | { statut: "agent_inconnu" }
  | { statut: "role_refuse" }
  | { statut: "analyste_national" };

// Mis en cache par requête : le layout et la page jugent sur le même verdict, sans double requête.
export const evaluerAccesEspaceAgent = cache(async (): Promise<AccesEspaceAgent> => {
  const proConnect = await checkProConnectAccess();
  if (!proConnect.hasAccess) {
    return proConnect.errorCode === AccessErrorCode.NOT_AUTHENTICATED
      ? { statut: "non_connecte" }
      : { statut: "methode_invalide" };
  }

  const agentResult = await getCurrentAgent();
  if (!agentResult.success) {
    return { statut: "agent_inconnu" };
  }

  const agent = agentResult.data;
  if (!ROLES_ESPACE_AGENT.includes(agent.role as UserRole)) {
    return { statut: "role_refuse" };
  }

  if (agent.role === UserRole.ANALYSTE) {
    const departements = await agentPermissionsRepository.getDepartementsByAgentId(agent.id);
    if (departements.length === 0) {
      return { statut: "analyste_national" };
    }
  }

  return { statut: "autorise", agent };
});

// Garde de page : Next rend la page même quand le layout refuse, son RSC part donc dans le HTML.
export async function exigerAccesEspaceAgent(): Promise<Agent> {
  const acces = await evaluerAccesEspaceAgent();

  if (acces.statut === "autorise") return acces.agent;
  if (acces.statut === "non_connecte") redirect(ROUTES.connexion.agent);
  if (acces.statut === "analyste_national") redirect(ROUTES.backoffice.administration.root);
  notFound();
}
