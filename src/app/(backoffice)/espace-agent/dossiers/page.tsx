import { DossiersPanel } from "./components/DossiersPanel";
import { resolveEspaceAgentAccess } from "@/features/backoffice/shared/actions/super-admin-access";
import { UserRole } from "@/shared/domain/value-objects";

/**
 * Espace AMO - Page des dossiers suivis et archivés
 */
export default async function DossiersAmoPage() {
  const access = await resolveEspaceAgentAccess();

  const role = access.kind !== "error" ? (access.agent.role as UserRole) : null;
  const canCreateDossier = role === UserRole.ALLERS_VERS || role === UserRole.AMO_ET_ALLERS_VERS;

  return <DossiersPanel canCreateDossier={canCreateDossier} />;
}
