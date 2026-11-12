import { checkAgentAccess, ROUTES } from "@/features/auth";
import { AccesNonAutoriseAdmin } from "@/shared/components";
import { redirect } from "next/navigation";
import { isAdminRole } from "@/shared/domain/value-objects/user-role.enum";
import ExpertsPanel from "./components/ExpertsPanel";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/** Experts validés par la DHUP : gérés par le super-administrateur, consultés par l'administrateur. */
export default async function ExpertsAdministrationPage() {
  const access = await checkAgentAccess();

  if (!access.hasAccess && access.errorCode === "NOT_AUTHENTICATED") {
    redirect(ROUTES.connexion.agent);
  }

  if (!access.hasAccess || !access.user?.role || !isAdminRole(access.user.role)) {
    return <AccesNonAutoriseAdmin />;
  }

  return <ExpertsPanel />;
}
