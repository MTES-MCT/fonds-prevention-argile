import { redirect } from "next/navigation";
import { checkAgentAccess, ROUTES } from "@/features/auth";
import { AccesNonAutoriseAdmin } from "@/shared/components";
import { isSuperAdminRole } from "@/shared/domain/value-objects/user-role.enum";
import ActivitePanel from "./components/ActivitePanel";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * Page super-admin : nombre d'actions agents par type (commentaires, appels...)
 * avec evolution par rapport a la periode precedente.
 */
export default async function ActivitePage() {
  const access = await checkAgentAccess();

  if (!access.hasAccess && access.errorCode === "NOT_AUTHENTICATED") {
    redirect(ROUTES.connexion.agent);
  }

  if (!access.hasAccess || !access.user?.role || !isSuperAdminRole(access.user.role)) {
    return <AccesNonAutoriseAdmin />;
  }

  return <ActivitePanel />;
}
