import { redirect } from "next/navigation";
import { resolveEspaceAgentAccess } from "@/features/backoffice/shared/actions/super-admin-access";
import { UserRole } from "@/shared/domain/value-objects";
import { CreationDossierWizard } from "@/features/backoffice/espace-agent/creation-dossier/components/CreationDossierWizard";

interface CreationDossierPageProps {
  searchParams: Promise<{ intent?: string }>;
}

/**
 * Page de création d'un dossier par un agent (AMO ou Aller-vers).
 * Accessible aux rôles AMO, ALLERS_VERS et AMO_ET_ALLERS_VERS.
 *
 * Param URL `?intent=av|amo` (défaut : amo) :
 * - `amo` : entrée depuis /espace-agent/dossiers. Le dossier sera claim sur
 *   l'entreprise AMO de l'agent. Redirect post-création → /dossiers.
 * - `av` : entrée depuis /espace-agent/prospects. Pas de claim AMO. Redirect
 *   post-création → /prospects.
 */
export default async function CreationDossierPage({ searchParams }: CreationDossierPageProps) {
  const access = await resolveEspaceAgentAccess();

  if (access.kind === "error") {
    redirect("/espace-agent/dossiers");
  }

  const role = access.agent.role as UserRole;
  const canCreate =
    role === UserRole.AMO || role === UserRole.ALLERS_VERS || role === UserRole.AMO_ET_ALLERS_VERS;

  if (!canCreate) {
    redirect("/espace-agent/dossiers");
  }

  const { intent: rawIntent } = await searchParams;
  const intent: "av" | "amo" = rawIntent === "av" ? "av" : "amo";

  return <CreationDossierWizard intent={intent} />;
}
