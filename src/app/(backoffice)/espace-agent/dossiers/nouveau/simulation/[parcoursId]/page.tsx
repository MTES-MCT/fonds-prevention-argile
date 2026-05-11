import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { resolveEspaceAgentAccess } from "@/features/backoffice/shared/actions/super-admin-access";
import { UserRole } from "@/shared/domain/value-objects";
import { parcoursRepo, userRepo } from "@/shared/database/repositories";
import { getEffectiveRGAData } from "@/features/parcours/core/services/rga-data.service";
import { SimulateurEditionInvitation } from "@/features/backoffice/espace-agent/creation-dossier/components/SimulateurEditionInvitation";

interface PageProps {
  params: Promise<{ parcoursId: string }>;
}

/**
 * Étape 3/4 du wizard (mode avec simulation) : simulation d'éligibilité
 * remplie par l'agent (AMO ou Aller-vers). Affichée dans le layout wizard
 * avec stepper 3/4.
 */
export default async function CreationDossierSimulationPage({ params }: PageProps) {
  const access = await resolveEspaceAgentAccess();
  if (access.kind === "error") redirect("/espace-agent/dossiers");

  const role = access.agent.role as UserRole;
  if (role !== UserRole.AMO && role !== UserRole.ALLERS_VERS && role !== UserRole.AMO_ET_ALLERS_VERS) {
    redirect("/espace-agent/dossiers");
  }

  const { parcoursId } = await params;
  const parcours = await parcoursRepo.findById(parcoursId);
  if (!parcours) notFound();

  const demandeur = await userRepo.findById(parcours.userId);
  if (!demandeur) notFound();

  const initialData = getEffectiveRGAData(parcours);
  const demandeurEmail = demandeur.email ?? "";

  return (
    <>
      {/* Header sur fond blanc */}
      <div className="fr-container fr-py-4w">
        <nav role="navigation" className="fr-breadcrumb" aria-label="vous êtes ici :">
          <button className="fr-breadcrumb__button" aria-expanded="false" aria-controls="breadcrumb-wizard-sim">
            Voir le fil d&apos;Ariane
          </button>
          <div className="fr-collapse" id="breadcrumb-wizard-sim">
            <ol className="fr-breadcrumb__list">
              <li>
                <Link className="fr-breadcrumb__link" href="/espace-agent/dossiers">
                  Accueil
                </Link>
              </li>
              <li>
                <span className="fr-breadcrumb__link" aria-current="page">
                  Ajout d&apos;un nouveau dossier
                </span>
              </li>
            </ol>
          </div>
        </nav>

        <h1 className="fr-mb-1v">Ajout d&apos;un nouveau dossier</h1>
        <p className="fr-text--md fr-mb-0 text-gray-500">
          Ce dossier pourra être rattaché à un demandeur (France Connect)
        </p>
      </div>

      {/* Zone wizard sur fond bleu */}
      <section className="fr-container-fluid fr-py-8w bg-(--background-alt-blue-france)">
        <div className="fr-container">
          <div className="fr-grid-row fr-grid-row--center">
            <div className="fr-col-12 fr-col-md-10 fr-col-lg-8">
              <div className="bg-white fr-p-6w">
                <SimulateurEditionInvitation
                  parcoursId={parcoursId}
                  initialData={initialData}
                  demandeurEmail={demandeurEmail}
                />
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
