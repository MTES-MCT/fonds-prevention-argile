import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getDemandeDetail } from "@/features/backoffice/espace-agent/demandes/services/demande-detail.service";
import { ROUTES } from "@/features/auth/domain/value-objects/configs/routes.config";
import { formatNomComplet, formatDate } from "@/shared/utils";
import { getCurrentUser } from "@/features/auth/services/user.service";
import { Status } from "@/shared/domain/value-objects/status.enum";
import {
  InfoDemandeur,
  InfoLogement,
  ParcoursDemandeur,
  AFaire,
  QualificationAllersVers,
  RenvoyerInvitationButton,
} from "../../shared";
import { ActionsRealisees } from "../../shared";
import { Step, STEP_LABELS_NUMBERED } from "@/shared/domain/value-objects/step.enum";
import { PiecesJustificatives } from "@/features/parcours/dossiers-ds/components";
import { getPiecesJustificativesForStep } from "@/features/parcours/dossiers-ds/services/pieces-justificatives.service";
import { ReponseAccompagnement } from "./components/ReponseAccompagnement";
import { qualificationService } from "@/features/backoffice/espace-agent/prospects/services/qualification.service";
import { agentsRepository } from "@/shared/database/repositories/agents.repository";
import { allersVersRepository } from "@/shared/database/repositories/allers-vers.repository";
import type { QualificationDecision } from "@/features/backoffice/espace-agent/prospects/domain/types";

interface PageProps {
  params: Promise<{ id: string }>;
}

// Force Next.js à ne pas cacher cette page (mode dynamique)
export const dynamic = "force-dynamic";

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

  // Une demande archivée (simulation devenue non éligible) n'est plus au stade « choix
  // AMO » : cette page afficherait à tort le bloc de validation. On renvoie vers la page
  // de suivi, archive-aware (affiche le motif). Défense en profondeur contre l'accès direct
  // par URL — le listing route déjà les archivés vers /dossiers/[id].
  if (demande.archivedAt) {
    redirect(ROUTES.backoffice.espaceAmo.dossier(id));
  }

  const nomComplet = formatNomComplet(demande.demandeur.prenom, demande.demandeur.nom);

  // Pièces à prévoir pour l'étape courante, tirées de la démarche DN correspondante.
  const piecesJustificatives = await getPiecesJustificativesForStep(demande.currentStep);

  // Récupérer la dernière qualification aller-vers
  const latestQualification = await qualificationService.getLatestQualification(demande.parcoursId);

  let qualificationAgentNom = "";
  let qualificationStructureNom = "";
  if (latestQualification) {
    const agent = await agentsRepository.findById(latestQualification.agentId);
    if (agent) {
      qualificationAgentNom = formatNomComplet(agent.givenName, agent.usualName);
      if (agent.allersVersId) {
        const structure = await allersVersRepository.findById(agent.allersVersId);
        qualificationStructureNom = structure?.nom ?? "";
      }
    }
  }

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
            {/* Invitation en attente (étape INVITATION = stub non réclamé) → renvoi possible. */}
            {demande.currentStep === Step.INVITATION && (
              <RenvoyerInvitationButton parcoursId={demande.parcoursId} email={demande.demandeur.email ?? ""} />
            )}
            <ReponseAccompagnement
              demandeId={demande.id}
              statutActuel={demande.statut}
              estMandataireFinancier={demande.estMandataireFinancier}
              noteAmo={demande.commentaire}
            />
            <div className="fr-mt-4w">
              <ActionsRealisees parcoursId={demande.parcoursId} />
            </div>
          </div>
          <div className="fr-col-12 fr-col-md-4">
            <div style={{ alignSelf: "flex-start" }}>
              <InfoDemandeur
                demandeur={demande.demandeur}
                editSimulationHref={ROUTES.backoffice.espaceAmo.editionDonneesSimulation(demande.id)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Panneau principal avec fond bleu - container fluid */}
      <section className="fr-background-alt--blue-france fr-py-4w">
        <div className="fr-container">
          <div className="fr-grid-row fr-grid-row--gutters">
            {/* Colonne gauche : QualificationAllersVers + InfoLogement + PiecesJustificatives */}
            <div className="fr-col-12 fr-col-md-8">
              {latestQualification && (
                <div className="fr-mb-4w">
                  <QualificationAllersVers
                    decision={latestQualification.decision as QualificationDecision}
                    actionsRealisees={latestQualification.actionsRealisees}
                    raisonsIneligibilite={latestQualification.raisonsIneligibilite}
                    estMandataireFinancier={latestQualification.estMandataireFinancier}
                    note={latestQualification.note}
                    agentNom={qualificationAgentNom}
                    structureNom={qualificationStructureNom}
                    createdAt={latestQualification.createdAt}
                  />
                </div>
              )}
              <div className="fr-mb-4w">
                <InfoLogement
                  logement={demande.logement}
                  adresse={demande.demandeur.adresse}
                  editSimulationHref={ROUTES.backoffice.espaceAmo.editionDonneesSimulation(demande.id)}
                  agentEditInfo={demande.agentEditInfo}
                />
              </div>
              <div>
                <PiecesJustificatives
                  pieces={piecesJustificatives}
                  stepLabel={STEP_LABELS_NUMBERED[demande.currentStep]}
                />
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
                <ParcoursDemandeur
                  currentStep={demande.currentStep}
                  currentStatus={Status.TODO}
                  dsStatus={null}
                  dates={demande.dates}
                  creator={demande.creator}
                />
                <AFaire
                  items={[
                    "Contacter le demandeur",
                    "Vérifier s'il y a des fissures",
                    "Contrôler la conformité des informations fournies par le demandeur",
                    "Répondre à l'accompagnement pour informer le demandeur de votre prise en charge",
                    "Informer et préparer le demandeur pour les étapes suivantes",
                  ]}
                />
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
