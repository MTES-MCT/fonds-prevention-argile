import { redirect } from "next/navigation";
import { getCurrentUser } from "@/features/auth/services/user.service";
import { hasPermission } from "@/features/auth/permissions/services/rbac.service";
import { BackofficePermission } from "@/features/auth/permissions/domain/value-objects/rbac-permissions";
import { UserRole } from "@/shared/domain/value-objects";

/**
 * Page d'accueil de l'espace agent
 * Redirige intelligemment selon les permissions de l'agent
 */
export default async function EspaceAgentHomePage() {
  // Récupérer l'utilisateur actuel
  const user = await getCurrentUser();
  if (!user) {
    redirect("/connexion/agent");
  }

  const role = user.role as UserRole;

  // Vérifier les permissions pour déterminer la redirection
  const hasDemandesPermission = hasPermission(role, BackofficePermission.DOSSIERS_AMO_READ);
  const hasProspectsPermission = hasPermission(role, BackofficePermission.PROSPECTS_VIEW);

  // Redirection selon les permissions
  if (hasDemandesPermission) {
    // AMO ou AMO_ET_ALLERS_VERS → rediriger vers Demandes
    redirect("/espace-agent/demandes");
  } else if (hasProspectsPermission) {
    // ALLERS_VERS → rediriger vers Prospects
    redirect("/espace-agent/prospects");
  }

  // Aucune permission → accès refusé
  redirect("/backoffice/access-denied");
}
