"use client";

import { AUTH_METHODS, useAuth } from "@/lib/auth/client";
import MonCompteLoading from "../../components/Loading/Loading";
import FaqAccountSection from "./common/FaqAccountSection";
import MaListe from "./common/MaListe";
import StepDetailSection from "./common/StepDetailSection";
import { useRGAContext } from "@/lib/form-rga/session/useRGAContext";
import DevTestSidebar from "./debug/DevTestSidebar";
import { DSStatus, Step } from "@/lib/parcours/parcours.types";

// Import des Callouts
import CalloutEligibiliteTodo from "./steps/eligibilite/CalloutEligibiliteTodo";
import CalloutEligibiliteEnConstruction from "./steps/eligibilite/CalloutEligibiliteEnConstruction";
import { useParcours } from "@/lib/parcours/hooks/useParcours";
import SimulationNeeded from "./common/SimulationNeededAlert";
import { STEP_LABELS } from "@/lib/parcours/parcours.constants";
import CalloutEligibiliteAccepte from "./steps/eligibilite/CalloutEligibiliteAccepte";
import CalloutEligibiliteEnInstruction from "./steps/eligibilite/CalloutEligibiliteEnInstruction";
import CalloutDiagnosticTodo from "./steps/diagnostic/CalloutDiagnosticTodo";

export default function MonCompteClient() {
  const { user, isLoading: isAuthLoading, isLoggingOut } = useAuth();
  const { hasData: hasRGAData, isLoading: isLoadingRGA } = useRGAContext();

  // Utilisation du hook parcours simplifié
  const {
    hasParcours,
    hasDossiers,
    currentStep,
    lastDSStatus,
    isLoading: isLoadingParcours,
  } = useParcours();

  // État de chargement global
  const isLoading = isAuthLoading || isLoadingRGA || isLoadingParcours;

  // Si France Connect mais pas de données
  const isFranceConnectWithoutData =
    user?.authMethod === AUTH_METHODS.FRANCECONNECT &&
    !hasRGAData &&
    !hasDossiers;

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
    return <MonCompteLoading />;
  }

  // Si pas d'user (ne devrait pas arriver car page protégée)
  if (!user) {
    return null;
  }

  // Cas où l'utilisateur est FranceConnect sans données RGA ni parcours
  // ou n'a ni parcours ni données RGA
  if (isFranceConnectWithoutData || (!hasRGAData && !hasParcours)) {
    return (
      <section className="fr-container-fluid fr-py-10w">
        <div className="fr-container">
          <SimulationNeeded />
        </div>
      </section>
    );
  }

  return (
    <>
      <section className="fr-container-fluid fr-py-10w">
        <div className="fr-container">
          <h1>Bonjour {user.firstName}</h1>
          <div className="fr-mb-4w">
            {/* Badge de statut d'étape */}
            {hasParcours && (
              <p className="fr-badge fr-badge--new fr-mr-2w">
                {getStatusLabel(lastDSStatus ?? undefined)}
              </p>
            )}

            {/* Badge d'étape */}
            {hasParcours && currentStep && (
              <p className="fr-badge fr-badge--info">
                {STEP_LABELS[currentStep]}{" "}
              </p>
            )}
          </div>
          {/* Affichage d'erreur si nécessaire */}
          {/* TODO : Voir comment gérer le cas d'erreur ? */}
          {/* {error && (
            <div className="fr-alert fr-alert--error fr-mb-2w">
              <p>{error}</p>
            </div>
          )} */}
          <div className="fr-grid-row fr-grid-row--gutters">
            <div className="fr-col-12 fr-col-md-8">
              {/* Affichage conditionnel des Callouts */}
              <CalloutManager
                hasDossiers={hasDossiers}
                hasParcours={hasParcours}
                dsStatus={lastDSStatus}
                currentStep={currentStep}
              />
            </div>

            <div className="fr-col-12 fr-col-md-4 flex justify-center md:justify-end">
              <MaListe />
            </div>
          </div>
        </div>
      </section>

      {/* Sections communes */}
      <StepDetailSection />
      <FaqAccountSection />
      <DevTestSidebar />
    </>
  );
}

// Composant pour gérer l'affichage conditionnel des Callouts
function CalloutManager({
  hasDossiers,
  hasParcours,
  dsStatus,
  currentStep,
}: {
  hasDossiers: boolean;
  hasParcours: boolean;
  dsStatus: DSStatus | null;
  currentStep: Step | null;
}) {
  // Si pas de parcours, rien à afficher
  if (!hasParcours || !currentStep) {
    return null;
  }

  // Gestion selon l'étape courante
  switch (currentStep) {
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
  return <div>Callout Devis (à créer)</div>;
}

function renderFacturesCallout(dsStatus: DSStatus | null) {
  // TODO: Créer les callouts pour les factures
  return <div>Callout Factures (à créer)</div>;
}

// Helper pour les labels de statut
function getStatusLabel(status?: DSStatus): string {
  switch (status) {
    case DSStatus.NON_ACCESSIBLE:
      return "Non accessible";
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
      return "A faire";
  }
}
