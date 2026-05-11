import { notFound, redirect } from "next/navigation";
import { resolveEspaceAgentAccess } from "@/features/backoffice/shared/actions/super-admin-access";
import { UserRole } from "@/shared/domain/value-objects";
import { parcoursRepo } from "@/shared/database/repositories";
import { PostSimulationEmailStep } from "@/features/backoffice/espace-agent/creation-dossier/components/PostSimulationEmailStep";

interface PageProps {
  params: Promise<{ parcoursId: string }>;
}

/**
 * Étape 4/4 du wizard AV (mode avec simulation) : envoi optionnel de l'email
 * d'invitation au demandeur après simulation remplie par l'agent.
 */
export default async function CreationDossierEmailPage({ params }: PageProps) {
  const access = await resolveEspaceAgentAccess();
  if (access.kind === "error") redirect("/espace-agent/dossiers");

  const role = access.agent.role as UserRole;
  if (role !== UserRole.ALLERS_VERS && role !== UserRole.AMO_ET_ALLERS_VERS) {
    redirect("/espace-agent/dossiers");
  }

  const { parcoursId } = await params;
  const parcours = await parcoursRepo.findById(parcoursId);
  if (!parcours) notFound();

  return (
    <div className="fr-container fr-py-4w">
      <PostSimulationEmailStep parcoursId={parcoursId} />
    </div>
  );
}
