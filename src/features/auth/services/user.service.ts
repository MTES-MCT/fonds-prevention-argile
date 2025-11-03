import { getSession } from "./session.service";
import { AUTH_METHODS } from "../domain/value-objects/constants";
import type { AuthUser } from "../domain/entities";

/**
 * Service de gestion des utilisateurs
 */

/**
 * Récupère l'utilisateur courant avec ses infos complètes
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  const session = await getSession();
  if (!session) return null;

  // Pour un admin, pas besoin de DB
  if (session.authMethod === AUTH_METHODS.PASSWORD) {
    return {
      id: session.userId,
      role: session.role,
      authMethod: session.authMethod,
      firstName: "Administrateur",
      loginTime: new Date().toISOString(),
    };
  }

  // Pour un utilisateur FranceConnect
  return {
    id: session.userId,
    role: session.role,
    authMethod: session.authMethod,
    loginTime: new Date().toISOString(),
    firstName: session.firstName,
    lastName: session.lastName,
  };
}
