import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { ROUTES } from "@/features/auth/domain/value-objects/configs/routes.config";
import { evaluerAccesEspaceAgent } from "@/features/backoffice/espace-agent/shared/services/acces-espace-agent.service";
import { AccesNonAutoriseAmo, AccesNonAutoriseAgentNonEnregistre } from "@/shared/components";
import { UserRole } from "@/shared/domain/value-objects";
import SuperAdminReadOnlyBanner from "./components/SuperAdminReadOnlyBanner";

// Tout l'espace agent vit derrière une session ProConnect : hérité par chaque sous-route, rien n'y est prérendable.
export const dynamic = "force-dynamic";

interface EspaceAgentLayoutProps {
  children: ReactNode;
}

// Affichage seulement : la barrière est exigerAccesEspaceAgent, appelée par chaque page.
export default async function EspaceAgentLayout({ children }: EspaceAgentLayoutProps) {
  const acces = await evaluerAccesEspaceAgent();

  if (acces.statut === "non_connecte") redirect(ROUTES.connexion.agent);
  if (acces.statut === "analyste_national") redirect(ROUTES.backoffice.administration.root);
  if (acces.statut === "agent_inconnu") return <AccesNonAutoriseAgentNonEnregistre />;
  if (acces.statut !== "autorise") return <AccesNonAutoriseAmo />;

  return (
    <div>
      {acces.agent.role === UserRole.SUPER_ADMINISTRATEUR && <SuperAdminReadOnlyBanner />}
      {children}
    </div>
  );
}
