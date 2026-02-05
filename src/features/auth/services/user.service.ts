import { getSession } from "./session.service";
import { AUTH_METHODS } from "../domain/value-objects/constants";
import type { AuthUser } from "../domain/entities";
import type { UserRole } from "../domain/types";
import { isAgentRole } from "@/shared/domain/value-objects";
import { agentsRepo } from "@/shared/database";

/**
 * Service de gestion des utilisateurs
 */

/**
 * Récupère l'utilisateur courant avec ses infos complètes
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  const session = await getSession();
  if (!session) return null;

  // Pour un admin avec ancien système mot de passe (legacy)
  if (session.authMethod === AUTH_METHODS.PASSWORD) {
    return {
      id: session.userId,
      role: session.role,
      authMethod: session.authMethod,
      firstName: "Administrateur",
      loginTime: new Date().toISOString(),
    };
  }

  // Pour un agent ProConnect
  if (session.authMethod === AUTH_METHODS.PROCONNECT && isAgentRole(session.role as UserRole)) {
    // Récupérer les infos complémentaires de l'agent depuis la BDD
    // Note: session.userId contient l'ID de l'agent (UUID), pas le sub ProConnect
    const agent = await agentsRepo.findById(session.userId);

    return {
      id: session.userId,
      role: agent?.role ?? session.role, // Utiliser le rôle de la BDD (plus à jour)
      authMethod: session.authMethod,
      loginTime: new Date().toISOString(),
      firstName: session.firstName,
      lastName: session.lastName,
      agentId: agent?.id,
      entrepriseAmoId: agent?.entrepriseAmoId ?? undefined,
      allersVersId: agent?.allersVersId ?? undefined,
    };
  }

  // Pour un particulier FranceConnect
  if (session.authMethod === AUTH_METHODS.FRANCECONNECT) {
    return {
      id: session.userId,
      role: session.role,
      authMethod: session.authMethod,
      loginTime: new Date().toISOString(),
      firstName: session.firstName,
      lastName: session.lastName,
    };
  }

  // Fallback
  return {
    id: session.userId,
    role: session.role,
    authMethod: session.authMethod,
    loginTime: new Date().toISOString(),
  };
}
