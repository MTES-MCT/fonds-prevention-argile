import { notFound, redirect } from "next/navigation";
import { resolveEspaceAgentAccess } from "@/features/backoffice/shared/actions/super-admin-access";
import { UserRole } from "@/shared/domain/value-objects";
import { parcoursRepo, userRepo } from "@/shared/database/repositories";
import { getEffectiveRGAData } from "@/features/parcours/core/services/rga-data.service";
import { SimulateurEdition } from "@/features/simulateur/components/SimulateurEdition";

interface PageProps {
  params: Promise<{ parcoursId: string }>;
}

/**
 * Étape 3/4 du wizard AV : simulation d'éligibilité remplie par l'agent.
 * Réutilise SimulateurEdition et redirige vers l'étape email à la fin.
 */
export default async function CreationDossierSimulationPage({ params }: PageProps) {
  const access = await resolveEspaceAgentAccess();
  if (access.kind === "error") redirect("/espace-agent/dossiers");

  const role = access.agent.role as UserRole;
  if (role !== UserRole.ALLERS_VERS && role !== UserRole.AMO_ET_ALLERS_VERS) {
    redirect("/espace-agent/dossiers");
  }

  const { parcoursId } = await params;
  const parcours = await parcoursRepo.findById(parcoursId);
  if (!parcours) notFound();

  const demandeur = await userRepo.findById(parcours.userId);
  if (!demandeur) notFound();

  const nomComplet = `${demandeur.prenom ?? ""} ${demandeur.nom ?? ""}`.trim() || "Demandeur";
  const initialData = getEffectiveRGAData(parcours);

  const emailUrl = `/espace-agent/dossiers/nouveau/email/${parcoursId}`;

  return (
    <SimulateurEdition
      nomComplet={nomComplet}
      initialData={initialData}
      dossierId={parcoursId}
      redirectAfterSave={emailUrl}
      redirectAfterSaveList={emailUrl}
    />
  );
}
