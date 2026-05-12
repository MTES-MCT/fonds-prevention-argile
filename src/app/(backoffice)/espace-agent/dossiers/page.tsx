import { redirect } from "next/navigation";
import { DossiersPanel } from "./components/DossiersPanel";
import { resolveEspaceAgentAccess } from "@/features/backoffice/shared/actions/super-admin-access";
import { UserRole } from "@/shared/domain/value-objects";

/**
 * Espace AMO - Page des dossiers suivis et archivés.
 *
 * Accessible aux rôles AMO, AMO_ET_ALLERS_VERS et SUPER_ADMINISTRATEUR (lecture).
 * Un ALLERS_VERS pur est redirigé vers `/prospects` puisque la page repose sur
 * `parcours_amo_validations` et n'a aucun sens pour lui.
 */
export default async function DossiersAmoPage() {
  const access = await resolveEspaceAgentAccess();
  const role = access.kind !== "error" ? (access.agent.role as UserRole) : null;

  // AV pur → redirect /prospects (sa page de référence).
  if (role === UserRole.ALLERS_VERS) {
    redirect("/espace-agent/prospects");
  }

  // Bouton "+ Nouveau dossier" visible pour AMO et AMO_ET_ALLERS_VERS. Le lien
  // pointe vers `/dossiers/nouveau?intent=amo` (cf. DossiersSuivisHeader).
  const canCreateDossier = role === UserRole.AMO || role === UserRole.AMO_ET_ALLERS_VERS;

  return <DossiersPanel canCreateDossier={canCreateDossier} />;
}
