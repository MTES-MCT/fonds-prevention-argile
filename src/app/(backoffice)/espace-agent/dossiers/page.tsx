import { DossiersPanel } from "./components/DossiersPanel";
import { resolveEspaceAgentAccess } from "@/features/backoffice/shared/actions/super-admin-access";
import { getCurrentUser } from "@/features/auth/services/user.service";
import { UserRole } from "@/shared/domain/value-objects";

/**
 * Page des dossiers d'un agent — listing unifié par territoire.
 * Accessible à tous les rôles agents (AMO, ALLERS_VERS, AMO_ET_ALLERS_VERS)
 * et à SUPER_ADMINISTRATEUR en lecture.
 */
export default async function DossiersAgentPage() {
  const access = await resolveEspaceAgentAccess();
  const role = access.kind !== "error" ? (access.agent.role as UserRole) : null;
  const user = await getCurrentUser();

  // Bouton "+ Nouveau dossier" visible pour tout agent métier (intent résolu côté wizard).
  const canCreateDossier =
    role === UserRole.AMO || role === UserRole.AMO_ET_ALLERS_VERS || role === UserRole.ALLERS_VERS;

  return <DossiersPanel canCreateDossier={canCreateDossier} prenom={user?.firstName ?? null} />;
}
