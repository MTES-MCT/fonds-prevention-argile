import { redirect } from "next/navigation";
import { checkAmoAccess, checkProConnectAccess, ROUTES } from "@/features/auth";
import { AccesNonAutoriseAmo, AccesNonAutoriseAgentNonEnregistre } from "@/shared/components";
import { getCurrentAgent } from "@/features/backoffice";
import { AmoDossiersPanel } from "./components/AmoDossiersPanel";

/**
 * Espace AMO - Page des dossiers suivis
 *
 * Affiche les dossiers que l'AMO accompagne activement
 */
export default async function DossiersAmoPage() {
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

  return <AmoDossiersPanel />;
}
