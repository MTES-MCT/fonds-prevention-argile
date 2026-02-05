import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getProspectDetail } from "@/features/backoffice/espace-agent/prospects/services/prospect-detail.service";
import { ROUTES } from "@/features/auth/domain/value-objects/configs/routes.config";
import { formatNomComplet, formatDateShort } from "@/shared/utils";
import { getCurrentUser } from "@/features/auth/services/user.service";
import { STEP_LABELS_NUMBERED } from "@/shared/domain/value-objects/step.enum";
import { InfoDemandeur, InfoLogement, LocalisationLogement, ParcoursDemandeur } from "../../shared";

interface PageProps {
  params: Promise<{ id: string }>;
}

// Force Next.js à ne pas cacher cette page (mode dynamique)
export const dynamic = "force-dynamic";

/**
 * Page détail d'un prospect (Espace Allers-Vers)
 */
export default async function ProspectDetailPage({ params }: PageProps) {
  // Vérifier l'authentification
  const user = await getCurrentUser();
  if (!user) {
    redirect(ROUTES.connexion.agent);
  }

  const { id } = await params;

  // Récupérer les données du prospect
  const result = await getProspectDetail(id);

  if (!result.success || !result.data) {
    notFound();
  }

  const prospect = result.data;
  const nomComplet = formatNomComplet(prospect.particulier.prenom, prospect.particulier.nom);

  // Construire les objets pour les composants partagés
  const demandeur = {
    prenom: prospect.particulier.prenom,
    nom: prospect.particulier.nom,
    email: prospect.particulier.email,
    telephone: null,
    adresse: prospect.logement.adresse,
  };

  const logement = {
    anneeConstruction: null,
    nombreNiveaux: null,
    etatMaison: null,
    zoneExposition: null,
    indemnisationPasseeRGA: null,
    indemnisationAvantJuillet2025: null,
    indemnisationAvantJuillet2015: null,
    montantIndemnisation: null,
    nombreHabitants: null,
    niveauRevenu: null,
    codeInsee: prospect.logement.commune,
    lat: null,
    lon: null,
    rnbId: null,
  };

  return (
    <>
      <div className="fr-container fr-py-4w">
        {/* Fil d'Ariane */}
        <nav role="navigation" className="fr-breadcrumb" aria-label="vous êtes ici :">
          <button className="fr-breadcrumb__button" aria-expanded="false" aria-controls="breadcrumb-1">
            Voir le fil d&apos;Ariane
          </button>
          <div className="fr-collapse" id="breadcrumb-1">
            <ol className="fr-breadcrumb__list">
              <li>
                <Link className="fr-breadcrumb__link" href={ROUTES.backoffice.espaceAgent.root}>
                  Accueil
                </Link>
              </li>
              <li>
                <Link className="fr-breadcrumb__link" href={ROUTES.backoffice.espaceAgent.prospects}>
                  Nouveau prospect
                </Link>
              </li>
              <li>
                <a className="fr-breadcrumb__link" aria-current="page">
                  {nomComplet}
                </a>
              </li>
            </ol>
          </div>
        </nav>

        {/* Titre de la page */}
        <div className="fr-mb-4w">
          <h1 className="fr-h2 fr-mb-2w">{nomComplet}</h1>
          <div className="fr-badges-group">
            <p className="fr-badge fr-badge--new">
              Nouveau prospect du {formatDateShort(prospect.createdAt.toISOString())}
            </p>
            <p className="fr-badge">
              {STEP_LABELS_NUMBERED[prospect.currentStep] || prospect.currentStep}
            </p>
          </div>
        </div>

        {/* Section informations */}
        <div className="fr-grid-row fr-grid-row--gutters">
          <div className="fr-col-12 fr-col-md-8">
            <div className="fr-callout fr-callout--blue-ecume">
              <h3 className="fr-callout__title">Ce particulier n'a pas encore sollicité d'AMO</h3>
              <p className="fr-callout__text">
                Ce prospect a créé un compte et commencé son parcours, mais n'a pas encore fait de demande
                d'accompagnement auprès d'un AMO. Vous pouvez le contacter pour lui proposer vos services.
              </p>
            </div>
          </div>
          <div className="fr-col-12 fr-col-md-4">
            <InfoDemandeur demandeur={demandeur} />
          </div>
        </div>
      </div>

      {/* Panneau principal avec fond bleu */}
      <section className="fr-background-alt--blue-france fr-py-4w">
        <div className="fr-container">
          <div className="fr-grid-row fr-grid-row--gutters">
            {/* Colonne gauche */}
            <div className="fr-col-12 fr-col-md-8">
              <div className="fr-mb-4w">
                <InfoLogement logement={logement} />
              </div>
              <div>
                <LocalisationLogement logement={logement} adresse={prospect.logement.adresse} />
              </div>
            </div>

            {/* Colonne droite */}
            <div className="fr-col-12 fr-col-md-4">
              <ParcoursDemandeur
                currentStep={prospect.currentStep}
                dates={{
                  compteCreatedAt: prospect.createdAt,
                }}
              />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

/**
 * Génération des métadonnées de la page
 */
export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  const result = await getProspectDetail(id);

  if (!result.success || !result.data) {
    return {
      title: "Prospect non trouvé",
    };
  }

  const nomComplet = formatNomComplet(result.data.particulier.prenom, result.data.particulier.nom);

  return {
    title: `Prospect ${nomComplet} | Espace Agent`,
    description: `Détails du prospect ${nomComplet}`,
  };
}
