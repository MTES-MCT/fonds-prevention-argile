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
    dossiers,
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
          <pre>{JSON.stringify(dossiers, null, 2)}</pre>
          <p>
            Debug
            {hasDossiers
              ? "Vous avez des dossiers en cours."
              : "Vous n'avez pas de dossiers en cours."}
            {hasParcours
              ? " Vous avez un parcours en cours."
              : " Vous n'avez pas de parcours en cours."}
            {lastDSStatus
              ? ` Le statut de votre dossier est : ${getStatusLabel(lastDSStatus)}.`
              : " Vous n'avez pas de statut de dossier."}
          </p>
          ;
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
}: {
  hasDossiers: boolean;
  hasParcours: boolean;
  dsStatus: DSStatus | null;
  currentStep: Step | null;
}) {
  // Cas où on a un parcours mais pas encore de dossier DS ou statut NON_ACCESSIBLE
  if (hasParcours && (!dsStatus || dsStatus === DSStatus.NON_ACCESSIBLE)) {
    return <CalloutEligibiliteTodo />;
  }

  // Cas où on a un dossier mais pas de statut DS (ne devrait pas arriver ou brouillon ?)
  if (hasDossiers && !dsStatus) {
    return <CalloutEligibiliteTodo />;
  }

  // Cas où c'est en construction dans DS
  if (hasParcours && dsStatus === DSStatus.EN_CONSTRUCTION) {
    return <CalloutEligibiliteEnConstruction />;
  }

  // Cas où c'est en instruction
  if (hasParcours && dsStatus === DSStatus.EN_INSTRUCTION) {
    return <CalloutEligibiliteEnInstruction />;
  }

  // Cas où c'est accepté
  if (hasParcours && dsStatus === DSStatus.ACCEPTE) {
    return <CalloutEligibiliteAccepte />;
  }

  // TODO : Gérer les autres statuts (refusé, classé sans suite, non accessible)

  return null;
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
