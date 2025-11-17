"use client";

import { useAuth } from "@/features/auth/client";
import MaListe from "./common/MaListe";
import StepDetailSection from "./common/StepDetailSection";
import { useState } from "react";
import { useParcours } from "../context/useParcours";
import { Step } from "../domain";
import { PourEnSavoirPlusSectionContent } from "@/app/(home)/components/PourEnSavoirPlusSection";
import { StatutValidationAmo } from "../../amo/domain/value-objects";
import FaqAccountSection from "@/app/mon-compte/components/FaqAccountSection";
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
import Loading from "@/app/loading";
import SimulationNeededAlert from "@/app/mon-compte/components/SimulationNeededAlert";
import { useSimulateurRga } from "@/features/simulateur-rga";

export default function MonCompteClient() {
  const { user, isLoading: isAuthLoading, isLoggingOut } = useAuth();
  const { hasData: hasRGAData, isLoading: isLoadingRGA } = useSimulateurRga();
  const [showAmoSuccessAlert, setShowAmoSuccessAlert] = useState(false);

  // Utilisation du hook parcours simplifié
  const {
    hasParcours,
    hasDossiers,
    currentStep,
    lastDSStatus,
    statutAmo,
    refresh,
    isLoading: isLoadingParcours,
  } = useParcours();

  // État de chargement global
  const isLoading = isAuthLoading || isLoadingRGA || isLoadingParcours;

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

  // Gestion du chargement initial
  if (isLoading) {
    return <Loading />;
  }

  // Si pas d'user (ne devrait pas arriver car page protégée)
  if (!user) {
    return null;
  }

  // Cas où simulation nécessaire (France Connect sans données de RGA)
  if (!hasRGAData) {
    return (
      <section className="fr-container-fluid fr-py-10w">
        <div className="fr-container">
          <SimulationNeededAlert />
        </div>
      </section>
    );
  }

  return (
    <>
      <section className="fr-container-fluid fr-py-10w">
        <div className="fr-container">
          <h1>Bonjour {user.firstName}</h1>

          {/* Badges de statut */}
          <ul className="fr-badges-group fr-mb-4w">
            <li>
              {/* Badge de statut d'étape */}
              {hasParcours && (
                <p className="fr-badge fr-badge--new fr-mr-2w">
                  {getStatusBadgeLabel(currentStep, lastDSStatus, statutAmo) ||
                    "À faire"}
                </p>
              )}
            </li>
            <li>
              {/* Badge d'étape */}
              {hasParcours && currentStep && (
                <p className="fr-badge">{STEP_LABELS[currentStep]} </p>
              )}
            </li>
          </ul>

          {/* Alerte de succès AMO */}
          {showAmoSuccessAlert && (
            <div className="fr-alert fr-alert--success fr-mb-2w">
              <p className="fr-alert__title">Demande envoyée</p>
              <p>
                Votre demande de confirmation a été envoyée à l'AMO sélectionné.
                Merci de le contacter directement par mail ou téléphone
                également.
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
                onAmoSuccess={() => setShowAmoSuccessAlert(true)}
                refresh={refresh}
              />
            </div>

            <div className="fr-col-12 fr-col-md-4 flex justify-center md:justify-start self-start">
              <MaListe />
            </div>
          </div>
        </div>

        {/* Section "Pour en savoir plus" si logement non éligible */}
        {statutAmo === StatutValidationAmo.LOGEMENT_NON_ELIGIBLE && (
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
  currentStep,
  onAmoSuccess,
  refresh,
}: {
  hasDossiers: boolean;
  hasParcours: boolean;
  dsStatus: DSStatus | null;
  statutAmo: StatutValidationAmo | null;
  currentStep: Step | null;
  onAmoSuccess: () => void;
  refresh: () => Promise<void>;
}) {
  // Si pas de parcours, rien à afficher
  if (!hasParcours || !currentStep) {
    return null;
  }

  // Gestion selon l'étape courante
  switch (currentStep) {
    case Step.CHOIX_AMO:
      return renderChoixAmoCallout(statutAmo, onAmoSuccess, refresh);

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
  onAmoSuccess: () => void,
  refresh: () => Promise<void>
) {
  if (statutAmo === null) {
    return <CalloutAmoTodo onSuccess={onAmoSuccess} refresh={refresh} />;
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
      />
    );
  }
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

/**
 * Labels français des étapes
 */
const STEP_LABELS: Record<Step, string> = {
  [Step.CHOIX_AMO]: "1. Choix de l'AMO",
  [Step.ELIGIBILITE]: "2. Éligibilité",
  [Step.DIAGNOSTIC]: "3. Diagnostic",
  [Step.DEVIS]: "4. Devis",
  [Step.FACTURES]: "5. Factures",
} as const;
