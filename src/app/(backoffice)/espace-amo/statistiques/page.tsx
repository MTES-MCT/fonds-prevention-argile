import { redirect } from "next/navigation";
import { checkAmoAccess, checkProConnectAccess, ROUTES } from "@/features/auth";
import { AccesNonAutoriseAmo, AccesNonAutoriseAgentNonEnregistre } from "@/shared/components";
import { getCurrentAgent } from "@/features/backoffice";
import { AmoStatistiquesPanel } from "./components/AmoStatistiquesPanel";

/**
 * Espace AMO - Page des statistiques
 *
 * Affiche les statistiques de l'activité AMO
 */
export default async function StatistiquesAmoPage() {
  // Vérifier que l'utilisateur est connecté via ProConnect
  const proConnectCheck = await checkProConnectAccess();

  // Si pas connecté du tout → redirect vers connexion agent
  if (!proConnectCheck.hasAccess && proConnectCheck.errorCode === "NOT_AUTHENTICATED") {
    redirect(ROUTES.connexion.agent);
  }

  // Si pas ProConnect (ex: FranceConnect) : bloquer
  if (!proConnectCheck.hasAccess) {
    return <AccesNonAutoriseAmo />;
  }

  // Vérifier que l'agent est enregistré en BDD
  const agentResult = await getCurrentAgent();
  if (!agentResult.success) {
    return <AccesNonAutoriseAgentNonEnregistre />;
  }

  // Vérifier que l'utilisateur est AMO
  const amoCheck = await checkAmoAccess();
  if (!amoCheck.hasAccess) {
    return <AccesNonAutoriseAmo />;
  }

  return <AmoStatistiquesPanel />;
}
