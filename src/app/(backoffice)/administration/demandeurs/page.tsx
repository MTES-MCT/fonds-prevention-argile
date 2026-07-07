import { checkAgentAccess, ROUTES } from "@/features/auth";
import { AccesNonAutoriseAdmin } from "@/shared/components";
import { redirect } from "next/navigation";
import UsersTrackingPanel from "./components/UsersTrackingPanel";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * Page de suivi des demandeurs.
 *
 * Accessible à tout agent (ADR-0017). La distinction fine se fait par permission
 * dans le panneau : les admins (`USERS_DETAIL_READ`) voient la liste NOMINATIVE ;
 * les autres agents (`USERS_STATS_READ` : analyste, AMO, Allers-Vers) ne voient que
 * les onglets STATS agrégés/anonymisés — jamais l'identité des demandeurs.
 */
export default async function DemandeursPage() {
  const access = await checkAgentAccess();

  if (!access.hasAccess && access.errorCode === "NOT_AUTHENTICATED") {
    redirect(ROUTES.connexion.agent);
  }

  if (!access.hasAccess) {
    return <AccesNonAutoriseAdmin />;
  }

  return <UsersTrackingPanel />;
}
