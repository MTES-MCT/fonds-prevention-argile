import { redirect } from "next/navigation";
import { resolveEspaceAgentAccess } from "@/features/backoffice/shared/actions/super-admin-access";
import { UserRole } from "@/shared/domain/value-objects";
import { CreationDossierWizard } from "@/features/backoffice/espace-agent/creation-dossier/components/CreationDossierWizard";

/**
 * Page de création d'un dossier par un agent Aller-vers.
 * Accessible uniquement aux rôles ALLERS_VERS ou AMO_ET_ALLERS_VERS.
 */
export default async function CreationDossierPage() {
  const access = await resolveEspaceAgentAccess();

  if (access.kind === "error") {
    redirect("/espace-agent/dossiers");
  }

  const role = access.agent.role as UserRole;
  const isAllerVers = role === UserRole.ALLERS_VERS || role === UserRole.AMO_ET_ALLERS_VERS;

  if (!isAllerVers) {
    redirect("/espace-agent/dossiers");
  }

  return <CreationDossierWizard />;
}
