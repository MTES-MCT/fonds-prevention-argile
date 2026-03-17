import { checkAgentAccess, ROUTES } from "@/features/auth";
import { AccesNonAutoriseAdmin } from "@/shared/components";
import { redirect } from "next/navigation";
import { UserRole } from "@/shared/domain/value-objects";
import AcquisitionPanel from "./components/AcquisitionPanel";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * Page des statistiques d'acquisition
 *
 * Accessible par les roles :
 * - SUPER_ADMINISTRATEUR
 * - ADMINISTRATEUR
 * - ANALYSTE
 * - ANALYSTE_DDT
 */
export default async function AcquisitionPage() {
  const access = await checkAgentAccess();

  if (!access.hasAccess && access.errorCode === "NOT_AUTHENTICATED") {
    redirect(ROUTES.connexion.agent);
  }

  if (!access.hasAccess) {
    return <AccesNonAutoriseAdmin />;
  }

  // Si AMO ou AMO_ET_ALLERS_VERS ou ALLERS_VERS : rediriger vers l'espace agent dedie
  if (
    access.user?.role === UserRole.AMO ||
    access.user?.role === UserRole.AMO_ET_ALLERS_VERS ||
    access.user?.role === UserRole.ALLERS_VERS
  ) {
    redirect(ROUTES.backoffice.espaceAgent.root);
  }

  return <AcquisitionPanel />;
}
