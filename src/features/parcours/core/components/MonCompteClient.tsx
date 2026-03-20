"use client";

import { useAuth } from "@/features/auth/client";
import MaListe from "./common/MaListe";
import StepDetailSection from "./common/StepDetailSection";
import ContactInfoModal from "./ContactInfoModal";
import { useState, useEffect } from "react";
import { useParcours } from "../context/useParcours";
import { getContactInfo } from "../actions/contact-info.actions";
import { Step, STEP_LABELS_NUMBERED } from "../domain";
import { StatutValidationAmo } from "../../amo/domain/value-objects";
import { DSStatus } from "../../dossiers-ds/domain";
import {
  CalloutAmoEnAttente,
  CalloutAmoLogementNonEligible,
  CalloutAmoTodo,
  CalloutDiagnosticTodo,
  CalloutEligibiliteAccepte,
  CalloutEligibiliteEnConstruction,
  CalloutEligibiliteEnInstruction,
  CalloutEligibiliteRefuse,
  CalloutEligibiliteTodo,
} from "./steps";
import { useSimulateurRga } from "@/features/simulateur";
import Loading from "@/app/(main)/loading";
import SimulationNeededAlert from "@/app/(main)/mon-compte/components/SimulationNeededAlert";
import { PourEnSavoirPlusSectionContent } from "@/app/(main)/(home)/components/PourEnSavoirPlusSection";
import FaqAccountSection from "@/app/(main)/mon-compte/components/FaqAccountSection";
import { useMigrateRGAToDB } from "../hooks";

export default function MonCompteClient() {
  // Migration RGA si nécessaire (après connexion FC)
  useMigrateRGAToDB();

  const { user, isLoading: isAuthLoading, isLoggingOut } = useAuth();
  const { hasData: hasTempRGAData, isLoading: isLoadingRGA } = useSimulateurRga();

  const [showAmoSuccessAlert, setShowAmoSuccessAlert] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [contactInfoChecked, setContactInfoChecked] = useState(false);
  const [contactInfoVersion, setContactInfoVersion] = useState(0);

  // Utilisation du hook parcours simplifié
  const {
    hasParcours,
    hasDossiers,
    currentStep,
    lastDSStatus,
    statutAmo,
    isQualifiedNonEligible,
    refresh,
    parcours,
    isLoading: isLoadingParcours,
  } = useParcours();

  const hasRGAData = hasTempRGAData || !!parcours?.rgaSimulationData;

  // Vérifier si les coordonnées de contact sont déjà renseignées
  useEffect(() => {
    if (!user || contactInfoChecked) return;
    getContactInfo().then((result) => {
      if (result.success && !result.data.emailContact && !result.data.telephone) {
        setShowContactModal(true);
      }
      setContactInfoChecked(true);
    });
  }, [user, contactInfoChecked]);

  // État de chargement global
  const isLoading = isAuthLoading || isLoadingRGA || isLoadingParcours;

  // Conditions de simulation nécessaire
  const needsSimulation = !isLoadingParcours && !hasRGAData && !hasDossiers;

  // Afficher un message de déconnexion
  if (isLoggingOut) {
    return (
      <div className="fr-container fr-py-8w">
        <div className="fr-alert fr-alert--info">
          <p className="fr-alert__title">Déconnexion en cours...</p>
          <p>Vous allez être redirigé.</p>
        </div>
      </div>
    );
  }

  // Afficher le chargement si les données ne sont pas prêtes
  if (isLoading || hasTempRGAData === undefined) {
    return <Loading />;
  }

  // Si pas d'utilisateur connecté (après le loading)
  if (!user) {
    return null;
  }

  if (needsSimulation) {
    return (
      <>
        <ContactInfoModal
          isOpen={showContactModal}
          defaultEmail={user.email}
          onClose={() => setShowContactModal(false)}
          onSuccess={() => {
            setShowContactModal(false);
            setContactInfoVersion((v) => v + 1);
          }}
        />
        <section className="fr-container-fluid fr-py-10w">
          <div className="fr-container">
            <SimulationNeededAlert />
          </div>
        </section>
      </>
    );
  }

  return (
    <>
      <ContactInfoModal
        isOpen={showContactModal}
        defaultEmail={user.email}
        onClose={() => setShowContactModal(false)}
        onSuccess={() => {
          setShowContactModal(false);
          setContactInfoVersion((v) => v + 1);
        }}
      />
      <section className="fr-container-fluid fr-py-10w">
        <div className="fr-container">
          <h1>Bonjour {user.firstName}</h1>

          {/* Badges de statut */}
          <ul className="fr-badges-group fr-mb-4w">
            <li>
              {/* Badge de statut d'étape */}
              {hasParcours && (
                <p className="fr-badge fr-badge--new fr-mr-2w">
                  {getStatusBadgeLabel(currentStep, lastDSStatus, statutAmo) || "À faire"}
                </p>
              )}
            </li>
            <li>
              {/* Badge d'étape */}
              {hasParcours && currentStep && <p className="fr-badge">{STEP_LABELS_NUMBERED[currentStep]} </p>}
            </li>
          </ul>

          {/* Alerte de succès AMO */}
          {showAmoSuccessAlert && (
            <div className="fr-alert fr-alert--success fr-mb-2w">
              <p className="fr-alert__title">Demande envoyée</p>
              <p>
                Votre demande de confirmation a été envoyée à l'AMO sélectionné. Merci de le contacter directement par
                mail ou téléphone également.
              </p>
            </div>
          )}

          <div className="fr-grid-row fr-grid-row--gutters fr-mb-4w">
            <div className="fr-col-12 fr-col-md-8">
              {/* Affichage conditionnel des Callouts */}
              <CalloutManager
                hasDossiers={hasDossiers}
                hasParcours={hasParcours}
                dsStatus={lastDSStatus}
                currentStep={currentStep}
                statutAmo={statutAmo}
                isQualifiedNonEligible={isQualifiedNonEligible}
                onAmoSuccess={() => setShowAmoSuccessAlert(true)}
                refresh={refresh}
                contactInfoVersion={contactInfoVersion}
              />
            </div>

            <div className="fr-col-12 fr-col-md-4 flex justify-center md:justify-start self-start">
              <MaListe />
            </div>
          </div>
        </div>

        {/* Section "Pour en savoir plus" si logement non éligible */}
        {(statutAmo === StatutValidationAmo.LOGEMENT_NON_ELIGIBLE || isQualifiedNonEligible) && (
          <PourEnSavoirPlusSectionContent />
        )}
      </section>

      {/* Sections communes */}
      <StepDetailSection />
      <FaqAccountSection />
    </>
  );
}

// Composant pour gérer l'affichage conditionnel des Callouts
function CalloutManager({
  hasParcours,
  dsStatus,
  statutAmo,
  isQualifiedNonEligible,
  currentStep,
  onAmoSuccess,
  refresh,
  contactInfoVersion,
}: {
  hasDossiers: boolean;
  hasParcours: boolean;
  dsStatus: DSStatus | null;
  statutAmo: StatutValidationAmo | null;
  isQualifiedNonEligible: boolean;
  currentStep: Step | null;
  onAmoSuccess: () => void;
  refresh: () => Promise<void>;
  contactInfoVersion: number;
}) {
  // Si pas de parcours, rien à afficher
  if (!hasParcours || !currentStep) {
    return null;
  }

  // Gestion selon l'étape courante
  switch (currentStep) {
    case Step.CHOIX_AMO:
      return renderChoixAmoCallout(statutAmo, isQualifiedNonEligible, onAmoSuccess, refresh, contactInfoVersion);

    case Step.ELIGIBILITE:
      return renderEligibiliteCallout(dsStatus);

    case Step.DIAGNOSTIC:
      return renderDiagnosticCallout(dsStatus);

    case Step.DEVIS:
      return renderDevisCallout(dsStatus);

    case Step.FACTURES:
      return renderFacturesCallout(dsStatus);

    default:
      return null;
  }
}

// Helpers pour chaque étape
function renderChoixAmoCallout(
  statutAmo: StatutValidationAmo | null,
  isQualifiedNonEligible: boolean,
  onAmoSuccess: () => void,
  refresh: () => Promise<void>,
  contactInfoVersion: number
) {
  // Si qualifié non éligible par un allers-vers (avant même le choix AMO)
  if (isQualifiedNonEligible && statutAmo === null) {
    return <CalloutAmoLogementNonEligible />;
  }

  if (statutAmo === null) {
    return <CalloutAmoTodo onSuccess={onAmoSuccess} refresh={refresh} contactInfoVersion={contactInfoVersion} />;
  }

  if (statutAmo === StatutValidationAmo.EN_ATTENTE) {
    return <CalloutAmoEnAttente />;
  }

  if (statutAmo === StatutValidationAmo.LOGEMENT_NON_ELIGIBLE) {
    return <CalloutAmoLogementNonEligible />;
  }

  if (statutAmo === StatutValidationAmo.ACCOMPAGNEMENT_REFUSE) {
    return (
      <CalloutAmoTodo
        accompagnementRefuse
        onSuccess={onAmoSuccess}
        refresh={refresh}
        contactInfoVersion={contactInfoVersion}
      />
    );
  }

  return undefined;
}

function renderEligibiliteCallout(dsStatus: DSStatus | null) {
  if (!dsStatus || dsStatus === DSStatus.NON_ACCESSIBLE) {
    return <CalloutEligibiliteTodo />;
  }

  if (dsStatus === DSStatus.EN_CONSTRUCTION) {
    return <CalloutEligibiliteEnConstruction />;
  }

  if (dsStatus === DSStatus.EN_INSTRUCTION) {
    return <CalloutEligibiliteEnInstruction />;
  }

  if (dsStatus === DSStatus.ACCEPTE) {
    return <CalloutEligibiliteAccepte />;
  }

  if (dsStatus === DSStatus.REFUSE) {
    return <CalloutEligibiliteRefuse />;
  }

  return null;
}

function renderDiagnosticCallout(dsStatus: DSStatus | null) {
  if (!dsStatus || dsStatus === DSStatus.NON_ACCESSIBLE) {
    return <CalloutDiagnosticTodo />;
  }

  if (dsStatus === DSStatus.EN_CONSTRUCTION) {
    return <CalloutDiagnosticTodo />;
  }

  if (dsStatus === DSStatus.EN_INSTRUCTION) {
    // return <CalloutDiagnosticEnInstruction />;
  }

  if (dsStatus === DSStatus.ACCEPTE) {
    // return <CalloutDiagnosticAccepte />;
  }

  return null;
}

function renderDevisCallout(dsStatus: DSStatus | null) {
  // TODO: Créer les callouts pour le devis
  return (
    <div>
      Callout Devis (à créer)
      <pre>{JSON.stringify(dsStatus, null, 2)}</pre>
    </div>
  );
}

function renderFacturesCallout(dsStatus: DSStatus | null) {
  // TODO: Créer les callouts pour les factures
  return (
    <div>
      Callout factures (à créer)
      <pre>{JSON.stringify(dsStatus, null, 2)}</pre>
    </div>
  );
}

// Helper pour obtenir le label du badge de statut
function getStatusBadgeLabel(
  currentStep: Step | null,
  lastDSStatus: DSStatus | null,
  statutAmo: StatutValidationAmo | null
): string | null {
  // Si on est à l'étape CHOIX_AMO, afficher le statut AMO
  if (currentStep === Step.CHOIX_AMO) {
    if (!statutAmo) return "En construction";

    switch (statutAmo) {
      case StatutValidationAmo.EN_ATTENTE:
        return "Attente de l'AMO";
      case StatutValidationAmo.LOGEMENT_ELIGIBLE:
        return "Validé";
      case StatutValidationAmo.LOGEMENT_NON_ELIGIBLE:
        return "Non éligible";
      case StatutValidationAmo.ACCOMPAGNEMENT_REFUSE:
        return "Refusé";
      default:
        return null;
    }
  }

  // Sinon, afficher le statut DS
  if (!lastDSStatus) return null;

  switch (lastDSStatus) {
    case DSStatus.NON_ACCESSIBLE:
      return "À faire";
    case DSStatus.ACCEPTE:
      return "Accepté";
    case DSStatus.EN_INSTRUCTION:
      return "En instruction";
    case DSStatus.EN_CONSTRUCTION:
      return "En construction";
    case DSStatus.REFUSE:
      return "Refusé";
    case DSStatus.CLASSE_SANS_SUITE:
      return "Classé sans suite";
    default:
      return "À faire";
  }
}
