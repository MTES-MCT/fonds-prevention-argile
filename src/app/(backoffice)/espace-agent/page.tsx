import { redirect } from "next/navigation";
import { getCurrentAgent, AccesNonAutorise } from "@/features/backoffice";
import { UserRole } from "@/shared/domain/value-objects/user-role.enum";

/**
 * Point d'entrée unique pour les agents ProConnect
 *
 * Redirige automatiquement vers l'espace correspondant au rôle :
 * - Administrateur → /admin
 * - Instructeur → /instruction
 * - AMO → /espace-amo
 *
 * Affiche une page d'erreur si l'agent n'est pas enregistré
 */
export default async function EspaceAgentPage() {
  const result = await getCurrentAgent();

  // Agent non trouvé en BDD ou erreur
  if (!result.success) {
    return <AccesNonAutorise />;
  }

  const agent = result.data;

  // Redirection selon le rôle
  switch (agent.role) {
    case UserRole.ADMINISTRATEUR:
      redirect("/admin");

    case UserRole.INSTRUCTEUR:
      redirect("/instruction");

    case UserRole.AMO:
      redirect("/espace-amo");

    default:
      // Rôle inconnu ou non géré
      return <AccesNonAutorise />;
  }
}
