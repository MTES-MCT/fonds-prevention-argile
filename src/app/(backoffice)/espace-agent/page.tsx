import { redirect } from "next/navigation";
import { getCurrentUser } from "@/features/auth/services/user.service";
import { UserRole } from "@/shared/domain/value-objects";

/**
 * Page d'accueil de l'espace agent : tous les rôles agents accèdent à la même page de listing des dossiers, qui adapte son contenu en fonction du scope de l'agent.
 */
export default async function EspaceAgentHomePage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/connexion/agent");
  }

  const role = user.role as UserRole;

  // ANALYSTE inclus : un national est déjà redirigé par la garde du layout, donc tout analyste ici est départemental.
  const isAgentRole =
    role === UserRole.AMO ||
    role === UserRole.ALLERS_VERS ||
    role === UserRole.AMO_ET_ALLERS_VERS ||
    role === UserRole.ANALYSTE ||
    role === UserRole.SUPER_ADMINISTRATEUR;

  if (isAgentRole) {
    redirect("/espace-agent/dossiers");
  }

  redirect("/backoffice/access-denied");
}
