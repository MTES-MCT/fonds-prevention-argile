import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getDossierDetail } from "@/features/backoffice/espace-agent/dossiers/services/dossier-detail.service";
import { ROUTES } from "@/features/auth/domain/value-objects/configs/routes.config";
import { formatNomComplet } from "@/shared/utils";
import { getCurrentUser } from "@/features/auth/services/user.service";
import { STEP_LABELS } from "@/features/backoffice/espace-agent/dossiers/domain/types";
import { InfoDemandeur, InfoLogement, LocalisationLogement, ParcoursDemandeur, AFaire } from "../../shared";
import { NotesPartagees } from "../../shared";
import { InfoDossierCallout } from "./components/InfoDossierCallout";
import { PiecesJustificatives } from "./components/PiecesJustificatives";
import { GagnezDuTempsTravaux } from "./components/GagnezDuTempsTravaux";

interface PageProps {
  params: Promise<{ id: string }>;
}

/**
 * Page détail d'un dossier suivi (Espace AMO)
 */
export default async function DossierDetailPage({ params }: PageProps) {
  // Vérifier l'authentification
  const user = await getCurrentUser();
  if (!user) {
    redirect(ROUTES.connexion.agent);
  }

  const { id } = await params;

  // Récupérer les données du dossier
  const result = await getDossierDetail(id);

  if (!result.success || !result.data) {
    notFound();
  }

  const dossier = result.data;
  const nomComplet = formatNomComplet(dossier.demandeur.prenom, dossier.demandeur.nom);

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
                <Link className="fr-breadcrumb__link" href={ROUTES.backoffice.espaceAmo.dossiers}>
                  Vos dossiers
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
            <p className="fr-badge fr-badge--new">EN CONSTRUCTION</p>
            <p className="fr-badge">{STEP_LABELS[dossier.currentStep]}</p>
          </div>
        </div>

        {/* Section en-tête : Callout + InfoDemandeur */}
        <div className="fr-grid-row fr-grid-row--gutters">
          <div className="fr-col-12 fr-col-md-8">
            <InfoDossierCallout currentStep={dossier.currentStep} />
          </div>
          <div className="fr-col-12 fr-col-md-4">
            <div style={{ alignSelf: "flex-start" }}>
              <InfoDemandeur demandeur={dossier.demandeur} suiviDepuis={dossier.suiviDepuis} />
            </div>
          </div>
        </div>
      </div>

      {/* Panneau principal avec fond bleu - container fluid */}
      <section className="fr-background-alt--blue-france fr-py-4w">
        <div className="fr-container">
          <div className="fr-grid-row fr-grid-row--gutters">
            {/* Colonne gauche : PiecesJustificatives + InfoLogement + LocalisationLogement + GagnezDuTempsTravaux */}
            <div className="fr-col-12 fr-col-md-8">
              <div className="fr-mb-4w">
                <PiecesJustificatives />
              </div>
              <div className="fr-mb-4w">
                <InfoLogement logement={dossier.logement} dateIndemnisation={dossier.dateIndemnisation} />
              </div>
              <div className="fr-mb-4w">
                <LocalisationLogement logement={dossier.logement} adresse={dossier.demandeur.adresse} />
              </div>
              <div>
                <GagnezDuTempsTravaux />
              </div>
            </div>

            {/* Colonne droite : ParcoursDemandeur + AFaireDossier */}
            <div className="fr-col-12 fr-col-md-4">
              <div
                style={{
                  alignSelf: "flex-start",
                  display: "flex",
                  flexDirection: "column",
                  gap: "2rem",
                }}>
                <ParcoursDemandeur
                  currentStep={dossier.currentStep}
                  dates={dossier.dates}
                  lastUpdatedAt={dossier.lastUpdatedAt}
                />
                <AFaire
                  items={[
                    "Aider le ménage à compléter son dossier sur Démarche numérique.",
                    "L'aider à récupérer ses pièces justificatives",
                    "S'assurer de la bonne complétion et des relances si le ménage n'avance pas sur le dépôt.",
                    "Préparer la suite pour effectuer le diagnostic si l'éligibilité est validée par la DDT.",
                  ]}
                />
                <NotesPartagees parcoursId={dossier.parcoursId} />
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
  const result = await getDossierDetail(id);

  if (!result.success || !result.data) {
    return {
      title: "Dossier non trouvé",
    };
  }

  const nomComplet = formatNomComplet(result.data.demandeur.prenom, result.data.demandeur.nom);

  return {
    title: `Dossier de ${nomComplet} | Espace AMO`,
    description: `Détails du dossier suivi de ${nomComplet}`,
  };
}
