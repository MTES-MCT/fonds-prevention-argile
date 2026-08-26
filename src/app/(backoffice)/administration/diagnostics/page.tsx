import { redirect } from "next/navigation";
import { checkAgentAccess, ROUTES } from "@/features/auth";
import { AccesNonAutoriseAdmin } from "@/shared/components";
import { isSuperAdminRole } from "@/shared/domain/value-objects/user-role.enum";
import DiagnosticsTabs from "./components/DiagnosticsTabs";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * Page super-admin : diagnostic data des parcours en anomalie Démarches Simplifiées.
 */
export default async function DiagnosticsPage() {
  const access = await checkAgentAccess();

  if (!access.hasAccess && access.errorCode === "NOT_AUTHENTICATED") {
    redirect(ROUTES.connexion.agent);
  }

  if (!access.hasAccess || !access.user?.role || !isSuperAdminRole(access.user.role)) {
    return <AccesNonAutoriseAdmin />;
  }

  return <DiagnosticsTabs />;
}
