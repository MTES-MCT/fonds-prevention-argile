import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getDemandeDetail } from "@/features/backoffice/espace-amo/demande/services/demande-detail.service";
import { ROUTES } from "@/features/auth/domain/value-objects/configs/routes.config";
import { formatNomComplet, formatDate } from "@/shared/utils";
import { ReponseAccompagnement } from "./components/ReponseAccompagnement";
import { InfoDemandeur } from "./components/InfoDemandeur";
import { InfoLogement } from "./components/InfoLogement";
import { AFaire } from "./components/AFaire";
import { LocalisationLogement } from "./components/LocalisationLogement";
import { getCurrentUser } from "@/features/auth/services/user.service";
import { ParcoursDemandeur } from "./components/ParcoursDemandeur";
import { GagnezDuTemps } from "./components/GagnezDuTemps";

interface PageProps {
  params: Promise<{ id: string }>;
}

/**
 * Page détail d'une demande d'accompagnement (Espace AMO)
 */
export default async function DemandeDetailPage({ params }: PageProps) {
  // Vérifier l'authentification
  const user = await getCurrentUser();
  if (!user) {
    redirect(ROUTES.connexion.agent);
  }

  const { id } = await params;

  // Récupérer les données de la demande
  const result = await getDemandeDetail(id);

  if (!result.success || !result.data) {
    notFound();
  }

  const demande = result.data;
  const nomComplet = formatNomComplet(demande.demandeur.prenom, demande.demandeur.nom);

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
                <Link className="fr-breadcrumb__link" href={ROUTES.backoffice.espaceAmo.root}>
                  Accueil
                </Link>
              </li>
              <li>
                <Link className="fr-breadcrumb__link" href={ROUTES.backoffice.espaceAmo.root}>
                  Demandes d&apos;accompagnement
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
              Nouvelle demande du {formatDate(demande.dateCreation.toISOString())}
            </p>
            <p className="fr-badge">1. Choix de l'AMO</p>
          </div>
        </div>

        {/* Section en-tête : Réponse + InfoDemandeur */}
        <div className="fr-grid-row fr-grid-row--gutters">
          <div className="fr-col-12 fr-col-md-8">
            <ReponseAccompagnement demandeId={demande.id} statutActuel={demande.statut} />
          </div>
          <div className="fr-col-12 fr-col-md-4">
            <div style={{ alignSelf: "flex-start" }}>
              <InfoDemandeur demandeur={demande.demandeur} />
            </div>
          </div>
        </div>
      </div>

      {/* Panneau principal avec fond bleu - container fluid */}
      <section className="fr-background-alt--blue-france fr-py-4w">
        <div className="fr-container">
          <div className="fr-grid-row fr-grid-row--gutters">
            {/* Colonne gauche : InfoLogement + LocalisationLogement + GagnezDuTemps */}
            <div className="fr-col-12 fr-col-md-8">
              <div className="fr-mb-4w">
                <InfoLogement logement={demande.logement} />
              </div>
              <div className="fr-mb-4w">
                <LocalisationLogement logement={demande.logement} adresse={demande.demandeur.adresse} />
              </div>
              <div>
                <GagnezDuTemps />
              </div>
            </div>

            {/* Colonne droite : À faire */}
            <div className="fr-col-12 fr-col-md-4">
              <div
                style={{
                  alignSelf: "flex-start",
                  display: "flex",
                  flexDirection: "column",
                  gap: "2rem",
                }}>
                <ParcoursDemandeur currentStep={demande.currentStep} parcoursCreatedAt={demande.parcoursCreatedAt} />
                <AFaire />
              </div>
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
  const result = await getDemandeDetail(id);

  if (!result.success || !result.data) {
    return {
      title: "Demande non trouvée",
    };
  }

  const nomComplet = formatNomComplet(result.data.demandeur.prenom, result.data.demandeur.nom);

  return {
    title: `Demande de ${nomComplet} | Espace AMO`,
    description: `Détails de la demande d'accompagnement de ${nomComplet}`,
  };
}
