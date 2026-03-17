import { checkAgentAccess, ROUTES } from "@/features/auth";
import { AccesNonAutoriseAdmin } from "@/shared/components";
import { redirect } from "next/navigation";
import { isSuperAdminRole } from "@/shared/domain/value-objects/user-role.enum";
import AgentsPanel from "../components/agents/AgentsPanel";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * Page de gestion des utilisateurs (agents)
 *
 * Accessible uniquement par les super-administrateurs.
 */
export default async function GestionUtilisateursPage() {
  const access = await checkAgentAccess();

  if (!access.hasAccess && access.errorCode === "NOT_AUTHENTICATED") {
    redirect(ROUTES.connexion.agent);
  }

  if (!access.hasAccess || !access.user?.role || !isSuperAdminRole(access.user.role)) {
    return <AccesNonAutoriseAdmin />;
  }

  return <AgentsPanel />;
}
