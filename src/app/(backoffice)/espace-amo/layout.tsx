import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { checkAmoAccess, checkProConnectAccess, ROUTES } from "@/features/auth";
import { getCurrentAgent } from "@/features/backoffice";
import { AccesNonAutoriseAmo, AccesNonAutoriseAgentNonEnregistre } from "@/shared/components";

interface EspaceAmoLayoutProps {
  children: ReactNode;
}

/**
 * Layout pour l'espace AMO (Server Component)
 *
 * Vérifie l'accès AMO avant d'afficher le contenu :
 * 1. Utilisateur connecté via ProConnect
 * 2. Agent enregistré en BDD
 * 3. Rôle AMO
 */
export default async function EspaceAmoLayout({ children }: EspaceAmoLayoutProps) {
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

  // Accès autorisé
  return <div>{children}</div>;
}
