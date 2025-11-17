"use client";

import { useAuth } from "@/features/auth/client";
import MaListe from "./common/MaListe";
import StepDetailSection from "./common/StepDetailSection";
import { useEffect, useState } from "react";
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

  // LOG: État du composant
  useEffect(() => {
    console.log("=== MonCompteClient render ===", {
      isLoading,
      isAuthLoading,
      isLoadingRGA,
      isLoadingParcours,
      hasRGAData,
      hasUser: !!user,
      userFirstName: user?.firstName,
      hasParcours,
      currentStep,
      statutAmo,
      lastDSStatus,
      hasDossiers,
    });
  }, [
    isLoading,
    isAuthLoading,
    isLoadingRGA,
    isLoadingParcours,
    hasRGAData,
    user,
    hasParcours,
    currentStep,
    statutAmo,
    lastDSStatus,
    hasDossiers,
  ]);

  // Afficher un message de déconnexion
  if (isLoggingOut) {
    console.log(">>> MonCompteClient: isLoggingOut = true");
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
    console.log(">>> MonCompteClient: isLoading = true");
    return <Loading />;
  }

  // Si pas d'user (ne devrait pas arriver car page protégée)
  if (!user) {
    console.log(">>> MonCompteClient: no user");
    return null;
  }

  // Cas où simulation nécessaire (France Connect sans données de RGA)
  if (!hasRGAData) {
    console.log(">>> MonCompteClient: no RGA data");
    return (
      <section className="fr-container-fluid fr-py-10w">
        <div className="fr-container">
          <SimulationNeededAlert />
        </div>
      </section>
    );
  }

  console.log(">>> MonCompteClient: rendering main content");

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
  console.log("=== CalloutManager render ===", {
    hasParcours,
    currentStep,
    statutAmo,
    dsStatus,
  });

  // Si pas de parcours, rien à afficher
  if (!hasParcours || !currentStep) {
    console.log(
      ">>> CalloutManager: no parcours or no currentStep, returning null"
    );
    return null;
  }

  console.log(`>>> CalloutManager: switching on currentStep: ${currentStep}`);

  // Gestion selon l'étape courante
  switch (currentStep) {
    case Step.CHOIX_AMO:
      console.log(">>> CalloutManager: rendering CHOIX_AMO");
      return renderChoixAmoCallout(statutAmo, onAmoSuccess, refresh);

    case Step.ELIGIBILITE:
      console.log(">>> CalloutManager: rendering ELIGIBILITE");
      return renderEligibiliteCallout(dsStatus);

    case Step.DIAGNOSTIC:
      console.log(">>> CalloutManager: rendering DIAGNOSTIC");
      return renderDiagnosticCallout(dsStatus);

    case Step.DEVIS:
      console.log(">>> CalloutManager: rendering DEVIS");
      return renderDevisCallout(dsStatus);

    case Step.FACTURES:
      console.log(">>> CalloutManager: rendering FACTURES");
      return renderFacturesCallout(dsStatus);

    default:
      console.log(">>> CalloutManager: default case, returning null");
      return null;
  }
}

// Helpers pour chaque étape
function renderChoixAmoCallout(
  statutAmo: StatutValidationAmo | null,
  onAmoSuccess: () => void,
  refresh: () => Promise<void>
) {
  console.log(">>> renderChoixAmoCallout:", { statutAmo });

  if (statutAmo === null) {
    console.log(">>> renderChoixAmoCallout: returning CalloutAmoTodo");
    return <CalloutAmoTodo onSuccess={onAmoSuccess} refresh={refresh} />;
  }

  if (statutAmo === StatutValidationAmo.EN_ATTENTE) {
    console.log(">>> renderChoixAmoCallout: returning CalloutAmoEnAttente");
    return <CalloutAmoEnAttente />;
  }

  if (statutAmo === StatutValidationAmo.LOGEMENT_NON_ELIGIBLE) {
    console.log(
      ">>> renderChoixAmoCallout: returning CalloutAmoLogementNonEligible"
    );
    return <CalloutAmoLogementNonEligible />;
  }

  if (statutAmo === StatutValidationAmo.ACCOMPAGNEMENT_REFUSE) {
    console.log(">>> renderChoixAmoCallout: returning CalloutAmoTodo (refusé)");
    return (
      <CalloutAmoTodo
        accompagnementRefuse
        onSuccess={onAmoSuccess}
        refresh={refresh}
      />
    );
  }

  console.log(">>> renderChoixAmoCallout: no match, returning undefined");
}

function renderEligibiliteCallout(dsStatus: DSStatus | null) {
  console.log(">>> renderEligibiliteCallout:", { dsStatus });

  if (!dsStatus || dsStatus === DSStatus.NON_ACCESSIBLE) {
    console.log(
      ">>> renderEligibiliteCallout: returning CalloutEligibiliteTodo"
    );
    return <CalloutEligibiliteTodo />;
  }

  if (dsStatus === DSStatus.EN_CONSTRUCTION) {
    console.log(
      ">>> renderEligibiliteCallout: returning CalloutEligibiliteEnConstruction"
    );
    return <CalloutEligibiliteEnConstruction />;
  }

  if (dsStatus === DSStatus.EN_INSTRUCTION) {
    console.log(
      ">>> renderEligibiliteCallout: returning CalloutEligibiliteEnInstruction"
    );
    return <CalloutEligibiliteEnInstruction />;
  }

  if (dsStatus === DSStatus.ACCEPTE) {
    console.log(
      ">>> renderEligibiliteCallout: returning CalloutEligibiliteAccepte"
    );
    return <CalloutEligibiliteAccepte />;
  }

  if (dsStatus === DSStatus.REFUSE) {
    console.log(
      ">>> renderEligibiliteCallout: returning CalloutEligibiliteRefuse"
    );
    return <CalloutEligibiliteRefuse />;
  }

  console.log(">>> renderEligibiliteCallout: no match, returning null");
  return null;
}

function renderDiagnosticCallout(dsStatus: DSStatus | null) {
  console.log(">>> renderDiagnosticCallout:", { dsStatus });

  if (!dsStatus || dsStatus === DSStatus.NON_ACCESSIBLE) {
    console.log(">>> renderDiagnosticCallout: returning CalloutDiagnosticTodo");
    return <CalloutDiagnosticTodo />;
  }

  if (dsStatus === DSStatus.EN_CONSTRUCTION) {
    console.log(
      ">>> renderDiagnosticCallout: returning CalloutDiagnosticTodo (en construction)"
    );
    return <CalloutDiagnosticTodo />;
  }

  if (dsStatus === DSStatus.EN_INSTRUCTION) {
    console.log(">>> renderDiagnosticCallout: EN_INSTRUCTION (commented out)");
    // return <CalloutDiagnosticEnInstruction />;
  }

  if (dsStatus === DSStatus.ACCEPTE) {
    console.log(">>> renderDiagnosticCallout: ACCEPTE (commented out)");
    // return <CalloutDiagnosticAccepte />;
  }

  console.log(">>> renderDiagnosticCallout: no match, returning null");
  return null;
}

function renderDevisCallout(dsStatus: DSStatus | null) {
  console.log(">>> renderDevisCallout:", { dsStatus });
  // TODO: Créer les callouts pour le devis
  return (
    <div>
      Callout Devis (à créer)
      <pre>{JSON.stringify(dsStatus, null, 2)}</pre>
    </div>
  );
}

function renderFacturesCallout(dsStatus: DSStatus | null) {
  console.log(">>> renderFacturesCallout:", { dsStatus });
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
