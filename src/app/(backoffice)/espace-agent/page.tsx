import { redirect } from "next/navigation";
import { exigerAccesEspaceAgent } from "@/features/backoffice/espace-agent/shared/services/acces-espace-agent.service";

/**
 * Page d'accueil de l'espace agent : tous les rôles agents accèdent à la même page de listing des dossiers, qui adapte son contenu en fonction du scope de l'agent.
 */
export default async function EspaceAgentHomePage() {
  await exigerAccesEspaceAgent();
  redirect("/espace-agent/dossiers");
}
