import { checkAgentAccess, ROUTES } from "@/features/auth";
import { AccesNonAutoriseAdmin } from "@/shared/components";
import { redirect } from "next/navigation";
import { isSuperAdminRole } from "@/shared/domain/value-objects/user-role.enum";
import StructuresPanel from "./components/StructuresPanel";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * Page des structures : leurs habilitations font les rôles de leurs agents.
 *
 * Accessible uniquement par les super-administrateurs.
 */
export default async function StructuresPage() {
  const access = await checkAgentAccess();

  if (!access.hasAccess && access.errorCode === "NOT_AUTHENTICATED") {
    redirect(ROUTES.connexion.agent);
  }

  if (!access.hasAccess || !access.user?.role || !isSuperAdminRole(access.user.role)) {
    return <AccesNonAutoriseAdmin />;
  }

  return <StructuresPanel />;
}
