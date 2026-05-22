import { ProspectsPanel } from "@/app/(backoffice)/espace-agent/prospects/components/ProspectsPanel";
import { resolveEspaceAgentAccess } from "@/features/backoffice/shared/actions/super-admin-access";
import { UserRole } from "@/shared/domain/value-objects";

/**
 * Espace Agent - Page des prospects (Allers-Vers).
 * Liste des particuliers du territoire qui n'ont pas fait de demande à un AMO.
 *
 * Le bouton "+ Nouveau dossier" est visible pour ALLERS_VERS et
 * AMO_ET_ALLERS_VERS — pointant vers `/dossiers/nouveau?intent=av` pour que la
 * création reste en « mode AV » (pas de claim AMO automatique).
 */
export default async function ProspectsPage() {
  const access = await resolveEspaceAgentAccess();
  const role = access.kind !== "error" ? (access.agent.role as UserRole) : null;

  const canCreateDossier = role === UserRole.ALLERS_VERS || role === UserRole.AMO_ET_ALLERS_VERS;

  return <ProspectsPanel canCreateDossier={canCreateDossier} />;
}
