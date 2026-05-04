import { redirect } from "next/navigation";
import { checkAgentAccess, ROUTES } from "@/features/auth";
import { AccesNonAutoriseAdmin } from "@/shared/components";
import { isSuperAdminRole } from "@/shared/domain/value-objects/user-role.enum";
import SynchronisationsPanel from "./components/SynchronisationsPanel";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * Page super-admin : historique des synchronisations CRON et déclenchement manuel.
 */
export default async function SynchronisationsPage() {
  const access = await checkAgentAccess();

  if (!access.hasAccess && access.errorCode === "NOT_AUTHENTICATED") {
    redirect(ROUTES.connexion.agent);
  }

  if (!access.hasAccess || !access.user?.role || !isSuperAdminRole(access.user.role)) {
    return <AccesNonAutoriseAdmin />;
  }

  return <SynchronisationsPanel />;
}
