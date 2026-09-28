import { Suspense } from "react";
import { DossiersPanel } from "./components/DossiersPanel";
import { getCurrentUser } from "@/features/auth/services/user.service";
import { exigerAccesEspaceAgent } from "@/features/backoffice/espace-agent/shared/services/acces-espace-agent.service";
import { UserRole } from "@/shared/domain/value-objects";

/**
 * Page des dossiers d'un agent — listing unifié par territoire.
 * Accessible à tous les rôles agents (AMO, ALLERS_VERS, AMO_ET_ALLERS_VERS)
 * et à SUPER_ADMINISTRATEUR en lecture.
 */
export default async function DossiersAgentPage() {
  const agent = await exigerAccesEspaceAgent();
  const role = agent.role as UserRole;
  const user = await getCurrentUser();

  // Bouton "+ Nouveau dossier" visible pour tout agent métier (intent résolu côté wizard).
  // Onglet « Mes dossiers » actif par défaut pour ces mêmes rôles ; un super-admin
  // (ni AMO ni AV) n'a aucun dossier dont il soit responsable : on l'ouvre sur
  // « Tous les dossiers ».
  const isAgentResponsable =
    role === UserRole.AMO || role === UserRole.AMO_ET_ALLERS_VERS || role === UserRole.ALLERS_VERS;

  return (
    <Suspense>
      <DossiersPanel
        canCreateDossier={isAgentResponsable}
        defaultScope={isAgentResponsable ? "mine" : "all"}
        prenom={user?.firstName ?? null}
      />
    </Suspense>
  );
}
