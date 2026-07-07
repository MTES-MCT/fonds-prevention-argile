import { checkAgentAccess, ROUTES } from "@/features/auth";
import { AccesNonAutoriseAdmin } from "@/shared/components";
import { redirect } from "next/navigation";
import { TableauDeBord } from "./tableau-de-bord/TableauDeBord";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * Page d'administration - Tableau de bord (agrégats nationaux).
 *
 * Accessible à tout agent (ADR-0017) : admins, analyste, et agents AMO /
 * Allers-Vers (stats nationales ouvertes). Les données restent agrégées et
 * non nominatives ; la garde fine des surfaces sensibles est ailleurs.
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

  return <TableauDeBord />;
}
