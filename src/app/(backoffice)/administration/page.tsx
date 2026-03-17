import { checkAgentAccess, ROUTES } from "@/features/auth";
import { AccesNonAutoriseAdmin } from "@/shared/components";
import { redirect } from "next/navigation";
import { TableauDeBord } from "./tableau-de-bord/TableauDeBord";
import { UserRole } from "@/shared/domain/value-objects";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * Page d'administration - Tableau de bord
 *
 * Accessible par les rôles :
 * - SUPER_ADMINISTRATEUR
 * - ADMINISTRATEUR
 * - ANALYSTE
 * - ANALYSTE_DDT
 */
export default async function AdminPage() {
  // Vérifier que l'utilisateur est un agent
  const access = await checkAgentAccess();

  // Si pas connecté du tout redirect vers connexion agent
  if (!access.hasAccess && access.errorCode === "NOT_AUTHENTICATED") {
    redirect(ROUTES.connexion.agent);
  }

  // Si connecté mais pas agent : afficher erreur 403
  if (!access.hasAccess) {
    return <AccesNonAutoriseAdmin />;
  }

  // Si AMO ou AMO_ET_ALLERS_VERS : rediriger vers l'espace agent dédié
  if (access.user?.role === UserRole.AMO || access.user?.role === UserRole.AMO_ET_ALLERS_VERS) {
    redirect(ROUTES.backoffice.espaceAgent.root);
  }

  // Si ALLERS_VERS : rediriger vers l'espace agent dédié
  if (access.user?.role === UserRole.ALLERS_VERS) {
    redirect(ROUTES.backoffice.espaceAgent.root);
  }

  return <TableauDeBord />;
}
