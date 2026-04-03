import { checkAgentAccess, ROUTES } from "@/features/auth";
import { AccesNonAutoriseAdmin } from "@/shared/components";
import { redirect } from "next/navigation";
import { isAdminRole } from "@/shared/domain/value-objects/user-role.enum";
import CommentairesAdminPanel from "./components/CommentairesAdminPanel";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * Page d'administration des notes partagees
 *
 * Accessible par les administrateurs et super-administrateurs.
 */
export default async function CommentairesAdminPage() {
  const access = await checkAgentAccess();

  if (!access.hasAccess && access.errorCode === "NOT_AUTHENTICATED") {
    redirect(ROUTES.connexion.agent);
  }

  if (!access.hasAccess || !access.user?.role || !isAdminRole(access.user.role)) {
    return <AccesNonAutoriseAdmin />;
  }

  return <CommentairesAdminPanel />;
}
