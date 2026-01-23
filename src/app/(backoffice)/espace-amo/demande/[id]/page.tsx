import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getDemandeDetail } from "@/features/backoffice/espace-amo/demande/services/demande-detail.service";
import { ROUTES } from "@/features/auth/domain/value-objects/configs/routes.config";
import { formatNomComplet, formatDate } from "@/shared/utils";
import { ReponseAccompagnement } from "./components/ReponseAccompagnement";
import { InfoDemandeur } from "./components/InfoDemandeur";
import { InfoLogement } from "./components/InfoLogement";
import { AFaire } from "./components/AFaire";
import { CarteLogement } from "./components/CarteLogement";
import { getCurrentUser } from "@/features/auth/services/user.service";

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
      <div className="fr-mb-6w">
        <h1 className="fr-h2 fr-mb-2w">{nomComplet}</h1>
        <p className="fr-badge fr-badge--new">Nouvelle demande du {formatDate(demande.dateCreation.toISOString())}</p>
      </div>

      <div className="fr-grid-row fr-grid-row--gutters">
        {/* Colonne gauche */}
        <div className="fr-col-12 fr-col-md-8">
          {/* Composant de réponse */}
          <div className="fr-mb-4w">
            <ReponseAccompagnement demandeId={demande.id} statutActuel={demande.statut} />
          </div>

          {/* Informations demandeur */}
          <div className="fr-mb-4w">
            <InfoDemandeur demandeur={demande.demandeur} />
          </div>

          {/* Informations logement */}
          <div className="fr-mb-4w">
            <InfoLogement logement={demande.logement} />
          </div>

          {/* Carte du logement */}
          <div className="fr-mb-4w">
            <CarteLogement logement={demande.logement} adresse={demande.demandeur.adresse} />
          </div>
        </div>

        {/* Colonne droite */}
        <div className="fr-col-12 fr-col-md-4">
          {/* Liste À faire */}
          <AFaire />
        </div>
      </div>
    </div>
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
