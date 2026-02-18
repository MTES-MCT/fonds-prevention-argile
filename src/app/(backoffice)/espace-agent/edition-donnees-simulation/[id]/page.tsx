import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getDossierSimulationData } from "@/features/backoffice/espace-agent/shared/services/edition-simulation.service";
import { ROUTES } from "@/features/auth/domain/value-objects/configs/routes.config";
import { formatNomComplet } from "@/shared/utils";
import { getCurrentUser } from "@/features/auth/services/user.service";
import { SimulateurEdition } from "@/features/simulateur/components/SimulateurEdition";
import { StatutValidationAmo } from "@/shared/domain/value-objects/statut-validation-amo.enum";

interface PageProps {
  params: Promise<{ id: string }>;
}

/**
 * Page d'édition des données de simulation d'éligibilité par un agent (AMO ou allers-vers).
 * Utilisée depuis les pages demandes et dossiers.
 */
export default async function EditionDonneesSimulationPage({ params }: PageProps) {
  const user = await getCurrentUser();
  if (!user) {
    redirect(ROUTES.connexion.agent);
  }

  const { id } = await params;

  const result = await getDossierSimulationData(id);

  if (!result.success || !result.data) {
    notFound();
  }

  const { prenom, nom, rgaData, statut } = result.data;
  const nomComplet = formatNomComplet(prenom, nom);

  const isDossier = statut === StatutValidationAmo.LOGEMENT_ELIGIBLE;
  const sectionLabel = isDossier ? "Vos dossiers" : "Demandes d\u2019accompagnement";
  const sectionHref = isDossier ? ROUTES.backoffice.espaceAmo.dossiers : ROUTES.backoffice.espaceAmo.root;
  const detailHref = isDossier
    ? ROUTES.backoffice.espaceAmo.dossier(id)
    : ROUTES.backoffice.espaceAmo.demande(id);

  return (
    <>
      {/* Bandeau bleu "Mode édition" */}
      <div className="fr-notice fr-notice--info">
        <div className="fr-container">
          <div className="fr-notice__body">
            <p>
              <span className="fr-notice__title">Mode édition</span>
              <span className="fr-notice__desc">
                Vous éditez le formulaire du demandeur, n&apos;oubliez pas de confirmer la mise à jour avant de fermer
                cet onglet
              </span>
            </p>
          </div>
        </div>
      </div>

      <div className="fr-container fr-py-1w">
        {/* Fil d'Ariane */}
        <nav role="navigation" className="fr-breadcrumb" aria-label="vous êtes ici :">
          <button className="fr-breadcrumb__button" aria-expanded="false" aria-controls="breadcrumb-edition">
            Voir le fil d&apos;Ariane
          </button>
          <div className="fr-collapse" id="breadcrumb-edition">
            <ol className="fr-breadcrumb__list">
              <li>
                <Link className="fr-breadcrumb__link" href={ROUTES.backoffice.espaceAmo.root}>
                  Accueil
                </Link>
              </li>
              <li>
                <Link className="fr-breadcrumb__link" href={sectionHref}>
                  {sectionLabel}
                </Link>
              </li>
              <li>
                <Link className="fr-breadcrumb__link" href={detailHref}>
                  {nomComplet}
                </Link>
              </li>
              <li>
                <a className="fr-breadcrumb__link" aria-current="page">
                  Données de simulation
                </a>
              </li>
            </ol>
          </div>
        </nav>

        {/* Simulateur en mode édition */}
        <SimulateurEdition nomComplet={nomComplet} initialData={rgaData} dossierId={id} />
      </div>
    </>
  );
}

/**
 * Génération des métadonnées de la page
 */
export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  const result = await getDossierSimulationData(id);

  if (!result.success || !result.data) {
    return {
      title: "Dossier non trouvé",
    };
  }

  const nomComplet = formatNomComplet(result.data.prenom, result.data.nom);

  return {
    title: `Édition simulation - ${nomComplet} | Espace Agent`,
    description: `Édition des données de simulation d'éligibilité de ${nomComplet}`,
  };
}
