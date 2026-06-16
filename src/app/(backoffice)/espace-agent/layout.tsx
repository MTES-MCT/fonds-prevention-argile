import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { checkProConnectAccess, ROUTES, checkRoleAccess } from "@/features/auth";
import { getCurrentAgent, isCurrentUserSuperAdmin } from "@/features/backoffice";
import { AccesNonAutoriseAmo, AccesNonAutoriseAgentNonEnregistre } from "@/shared/components";
import { UserRole } from "@/shared/domain/value-objects";
import { agentPermissionsRepository } from "@/shared/database";
import SuperAdminReadOnlyBanner from "./components/SuperAdminReadOnlyBanner";

interface EspaceAgentLayoutProps {
  children: ReactNode;
}

/**
 * Layout pour l'espace agent (Server Component)
 *
 * Vérifie l'accès agent avant d'afficher le contenu :
 * 1. Utilisateur connecté via ProConnect
 * 2. Agent enregistré en BDD
 * 3. Rôle AMO, ALLERS_VERS, AMO_ET_ALLERS_VERS, ANALYSTE (départemental) ou SUPER_ADMINISTRATEUR
 */
export default async function EspaceAgentLayout({ children }: EspaceAgentLayoutProps) {
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

  // Vérifier que l'utilisateur a un rôle agent métier (AMO, ALLERS_VERS, AMO_ET_ALLERS_VERS),
  // ANALYSTE (suivi DDT) ou SUPER_ADMINISTRATEUR (lecture seule pour recette / validation)
  const agentMetierCheck = await checkRoleAccess([
    UserRole.AMO,
    UserRole.ALLERS_VERS,
    UserRole.AMO_ET_ALLERS_VERS,
    UserRole.ANALYSTE,
    UserRole.SUPER_ADMINISTRATEUR,
  ]);

  if (!agentMetierCheck.hasAccess) {
    return <AccesNonAutoriseAmo />;
  }

  // Un analyste n'accède à l'espace agent que s'il est départemental (mode DDT).
  // L'analyste national (sans département) ne suit pas de dossiers → administration.
  if (agentResult.data.role === UserRole.ANALYSTE) {
    const departements = await agentPermissionsRepository.getDepartementsByAgentId(agentResult.data.id);
    if (departements.length === 0) {
      redirect(ROUTES.backoffice.administration.root);
    }
  }

  const isSuperAdmin = await isCurrentUserSuperAdmin();

  // Accès autorisé
  return (
    <div>
      {isSuperAdmin && <SuperAdminReadOnlyBanner />}
      {children}
    </div>
  );
}
