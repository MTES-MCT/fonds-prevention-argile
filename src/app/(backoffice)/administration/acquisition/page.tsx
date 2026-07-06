import { checkAgentAccess, ROUTES } from "@/features/auth";
import { AccesNonAutoriseAdmin } from "@/shared/components";
import { redirect } from "next/navigation";
import AcquisitionPanel from "./components/AcquisitionPanel";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * Page des statistiques d'acquisition (agrégats nationaux).
 *
 * Accessible à tout agent (ADR-0017) : admins, analyste, et agents AMO /
 * Allers-Vers (stats nationales ouvertes). Données agrégées, non nominatives.
 */
export default async function AcquisitionPage() {
  const access = await checkAgentAccess();

  if (!access.hasAccess && access.errorCode === "NOT_AUTHENTICATED") {
    redirect(ROUTES.connexion.agent);
  }

  if (!access.hasAccess) {
    return <AccesNonAutoriseAdmin />;
  }

  return <AcquisitionPanel />;
}
