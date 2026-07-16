import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getDossierDetail } from "@/features/backoffice/espace-agent/dossiers/services/dossier-detail.service";
import { ROUTES } from "@/features/auth/domain/value-objects/configs/routes.config";
import { formatNomComplet } from "@/shared/utils";
import { getCurrentUser } from "@/features/auth/services/user.service";
import { DOSSIER_STEP_LABELS } from "@/features/backoffice/espace-agent/dossiers/domain";
import {
  InfoDemandeur,
  InfoLogement,
  ParcoursDemandeur,
  AFaire,
  QualificationAllersVers,
  RenvoyerInvitationButton,
} from "../../shared";
import { ActionsRealisees } from "../../shared";
import { Step } from "@/shared/domain/value-objects/step.enum";
import { StatutValidationAmo } from "@/shared/domain/value-objects/statut-validation-amo.enum";
import { InfoDossierCallout } from "./components/InfoDossierCallout";
import { DossierStatusBadge } from "./components/DossierStatusBadge";
import { PiecesJustificatives } from "@/features/parcours/dossiers-ds/components";
import { getPiecesJustificativesForStep } from "@/features/parcours/dossiers-ds/services/pieces-justificatives.service";
import { GagnezDuTempsTravaux } from "./components/GagnezDuTempsTravaux";
import { GererDossierMenu } from "./components/GererDossierMenu";
import { DemandeArretAlert } from "./components/DemandeArretAlert";
import { ReouvrirDemandeButton } from "./components/ReouvrirDemandeButton";
import { STATUTS_REFUSES } from "@/features/backoffice/espace-agent/dossiers/domain/types/amo-dossiers.types";
import { ROLES_REOUVERTURE } from "@/features/backoffice/espace-agent/dossiers/domain/reouverture";
import { ROLES_ARRET_ACCOMPAGNEMENT } from "@/features/backoffice/espace-agent/dossiers/domain/arret-accompagnement";
import { getCurrentAgent } from "@/features/backoffice/shared/actions/agent.actions";
import { qualificationService } from "@/features/backoffice/espace-agent/prospects/services/qualification.service";
import { agentsRepository } from "@/shared/database/repositories/agents.repository";
import { allersVersRepository } from "@/shared/database/repositories/allers-vers.repository";
import type { QualificationDecision } from "@/features/backoffice/espace-agent/prospects/domain/types";

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

  // Pièces à prévoir pour l'étape courante, tirées de la démarche DN correspondante.
  const piecesJustificatives = await getPiecesJustificativesForStep(dossier.currentStep);

  // Bouton "Ré-ouvrir" : visible sur une demande refusée, pour les rôles habilités
  // (le périmètre fin entreprise/territoire est revérifié côté action).
  const isRefusee = dossier.validationStatut != null && STATUTS_REFUSES.includes(dossier.validationStatut);
  let canReouvrir = false;
  if (isRefusee) {
    const agentResult = await getCurrentAgent();
    canReouvrir = agentResult.success && ROLES_REOUVERTURE.includes(agentResult.data.role);
  }

  // « Ne plus accompagner » : réservé à l'AMO de l'entreprise rattachée (le périmètre
  // fin est revérifié côté action via assertCanActAsResponsable).
  const agentCourant = await getCurrentAgent();
  const peutArreterAccompagnement =
    agentCourant.success &&
    ROLES_ARRET_ACCOMPAGNEMENT.includes(agentCourant.data.role) &&
    dossier.entrepriseAmoId !== null &&
    agentCourant.data.entrepriseAmoId === dossier.entrepriseAmoId;

  // Le demandeur a demandé l'arrêt : l'AMO mandataire doit se prononcer.
  const arretADecider = dossier.demandeArretAt !== null && peutArreterAccompagnement;

  // Récupérer la dernière qualification aller-vers
  const latestQualification = await qualificationService.getLatestQualification(dossier.parcoursId);

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

        {/* Titre de la page & bouton archiver */}
        <div className="fr-mb-4w">
          <div className="fr-grid-row fr-grid-row--middle fr-grid-row--gutters">
            <div className="fr-col">
              <h1 className="fr-h2 fr-mb-2w">{nomComplet}</h1>
              <div className="fr-badges-group">
                <DossierStatusBadge dsStatus={dossier.dsStatus} />
                <p className="fr-badge">{DOSSIER_STEP_LABELS[dossier.currentStep]}</p>
              </div>
            </div>
            <div className="fr-col-auto">
              {canReouvrir ? (
                <ReouvrirDemandeButton parcoursId={dossier.parcoursId} />
              ) : (
                <GererDossierMenu
                  parcoursId={dossier.parcoursId}
                  demandeurNom={nomComplet}
                  peutArreterAccompagnement={peutArreterAccompagnement}
                />
              )}
            </div>
          </div>
        </div>

        {/* Section en-tête : Callout + InfoDemandeur */}
        <div className="fr-grid-row fr-grid-row--gutters">
          <div className="fr-col-12 fr-col-md-8">
            {arretADecider && <DemandeArretAlert parcoursId={dossier.parcoursId} demandeurNom={nomComplet} />}
            <InfoDossierCallout
              currentStep={dossier.currentStep}
              currentStatus={dossier.currentStatus}
              dsStatus={dossier.dsStatus}
              validationStatut={dossier.validationStatut}
              instructedAt={dossier.instructedAt}
            />
            {/* Invitation en attente (étape INVITATION = stub non réclamé) → renvoi possible,
                sauf dossier non éligible archivé. Le callout ci-dessus porte déjà le message. */}
            {dossier.currentStep === Step.INVITATION &&
              dossier.validationStatut !== StatutValidationAmo.LOGEMENT_NON_ELIGIBLE && (
                <RenvoyerInvitationButton
                  variant="inline"
                  parcoursId={dossier.parcoursId}
                  email={dossier.demandeur.email ?? ""}
                />
              )}
            <div className="fr-mt-4w">
              <ActionsRealisees parcoursId={dossier.parcoursId} />
            </div>
          </div>
          <div className="fr-col-12 fr-col-md-4">
            <div style={{ alignSelf: "flex-start" }}>
              <InfoDemandeur
                demandeur={dossier.demandeur}
                suiviDepuis={dossier.suiviDepuis ?? undefined}
                editSimulationHref={ROUTES.backoffice.espaceAmo.editionDonneesSimulation(dossier.id)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Panneau principal avec fond bleu - container fluid */}
      <section className="fr-background-alt--blue-france fr-py-4w">
        <div className="fr-container">
          <div className="fr-grid-row fr-grid-row--gutters">
            {/* Colonne gauche : PiecesJustificatives + InfoLogement + GagnezDuTempsTravaux */}
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
                <PiecesJustificatives
                  pieces={piecesJustificatives}
                  stepLabel={DOSSIER_STEP_LABELS[dossier.currentStep]}
                />
              </div>
              <div className="fr-mb-4w">
                <InfoLogement
                  logement={dossier.logement}
                  adresse={dossier.demandeur.adresse}
                  dateIndemnisation={dossier.dateIndemnisation}
                  editSimulationHref={ROUTES.backoffice.espaceAmo.editionDonneesSimulation(dossier.id)}
                  agentEditInfo={dossier.agentEditInfo}
                />
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
                  currentStatus={dossier.currentStatus}
                  dsStatus={dossier.dsStatus}
                  dates={dossier.dates}
                  lastUpdatedAt={dossier.lastUpdatedAt}
                  creator={dossier.creator}
                />
                <AFaire
                  items={[
                    "Aider le ménage à compléter son dossier sur Démarche numérique.",
                    "L'aider à récupérer ses pièces justificatives",
                    "S'assurer de la bonne complétion et des relances si le ménage n'avance pas sur le dépôt.",
                    "Préparer la suite pour effectuer le diagnostic si l'éligibilité est validée par la DDT.",
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
