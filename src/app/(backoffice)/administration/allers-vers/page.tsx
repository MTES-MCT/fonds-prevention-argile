import { checkAgentAccess, ROUTES } from "@/features/auth";
import { AccesNonAutoriseAdmin } from "@/shared/components";
import { redirect } from "next/navigation";
import { isAdminRole } from "@/shared/domain/value-objects/user-role.enum";
import AllersVersPanel from "./components/AllersVersPanel";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * Page de gestion des Allers Vers
 *
 * Accessible par les administrateurs et super-administrateurs.
 */
export default async function GestionAllersVersPage() {
  const access = await checkAgentAccess();

  if (!access.hasAccess && access.errorCode === "NOT_AUTHENTICATED") {
    redirect(ROUTES.connexion.agent);
  }

  if (!access.hasAccess || !access.user?.role || !isAdminRole(access.user.role)) {
    return <AccesNonAutoriseAdmin />;
  }

  return <AllersVersPanel />;
}
