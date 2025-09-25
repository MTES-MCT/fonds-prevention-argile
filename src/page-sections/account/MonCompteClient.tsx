"use client";

import { useAuth } from "@/lib/auth/client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import MonCompteLoading from "../../components/Loading/Loading";
import FaqAccountSection from "./common/FaqAccountSection";
import MaListe from "./common/MaListe";
import StepDetailSection from "./common/StepDetailSection";
import CalloutARemplir from "./steps/eligibilite/CalloutEligibiliteTodo";
import CalloutDiagnostic from "./steps/diagnostic/CalloutDiagnostic";
import CalloutEnInstruction from "./steps/en-instruction/CalloutEnInstruction";
import { useRGAContext } from "@/lib/form-rga/session/useRGAContext";
import DevTestSidebar from "./debug/DevTestSidebar";
import { getParcoursStatus } from "@/lib/actions/parcours/parcours.actions";
import { useDossierSync } from "@/hooks";
import { DSStatus, Step } from "@/lib/parcours/parcours.types";
import CalloutEligibiliteSimulateurARemplir from "./steps/eligibilite/CalloutEligibiliteSimulateurARemplir";
import CalloutEligibiliteTodo from "./steps/eligibilite/CalloutEligibiliteTodo";
import CalloutEligibiliteEnConstruction from "./steps/eligibilite/CalloutEligibiliteEnConstruction";

export default function MonCompteClient() {
  const { user, isLoading, isLoggingOut } = useAuth();
  const { hasData: hasRGAData, isLoading: isLoadingRGA } = useRGAContext();
  const router = useRouter();
  const [isRedirecting] = useState(false);
  const [showNoDataMessage, setShowNoDataMessage] = useState(false);
  const [hasParcours, setHasParcours] = useState(false);
  const [isCheckingParcours, setIsCheckingParcours] = useState(true);
  const [currentStep, setCurrentStep] = useState<Step>(Step.ELIGIBILITE);

  // Hook de synchronisation DS
  const {
    isSyncing,
    syncNow,
    lastSync,
    lastStatus,
    error: syncError,
  } = useDossierSync({
    autoSync: false,
    interval: 300000, // 5 minutes
    step: currentStep,
  });

  // Vérifier si l'utilisateur a un parcours en cours
  useEffect(() => {
    const checkParcours = async () => {
      if (user) {
        try {
          const result = await getParcoursStatus();

          if (result.success && result.data?.state) {
            setHasParcours(true);
            setCurrentStep(result.data.state.step);
          }
        } catch (error) {
          console.error("Erreur lors de la vérification du parcours:", error);
        }
      }
      // Ne mettre à false que si on a fini de charger l'user
      if (!isLoading) {
        setIsCheckingParcours(false);
      }
    };

    checkParcours();
  }, [user, isLoading]);

  // Sync DS initiale si parcours existe et pas de données RGA
  useEffect(() => {
    if (hasParcours && !hasRGAData && !isLoading && !isCheckingParcours) {
      syncNow();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasParcours, hasRGAData, isLoading, isCheckingParcours]);

  // Redirection si pas de données RGA ET pas de parcours
  useEffect(() => {
    if (
      isLoading ||
      isLoadingRGA ||
      isLoggingOut ||
      isRedirecting ||
      isCheckingParcours
    )
      return;

    // Si utilisateur connecté mais ni données RGA ni parcours existant
    if (user && !hasRGAData && !hasParcours) {
      setShowNoDataMessage(true);
    }
  }, [
    isLoading,
    isLoadingRGA,
    isCheckingParcours,
    user,
    hasRGAData,
    hasParcours,
    router,
    isLoggingOut,
    isRedirecting,
  ]);

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
  if (isLoading || isLoadingRGA || isCheckingParcours) {
    return <MonCompteLoading />;
  }

  // Message redirigeant si pas de données RGA ET pas de parcours ou si on force l'affichage
  if (showNoDataMessage || (!hasRGAData && !hasParcours)) {
    return (
      <section className="fr-container-fluid fr-py-10w">
        <div className="fr-container">
          <CalloutEligibiliteSimulateurARemplir />
        </div>
      </section>
    );
  }

  // Si redirection en cours ou pas d'user - ne rien afficher
  if (isRedirecting || !user) {
    return null;
  }

  return (
    <>
      <section className="fr-container-fluid fr-py-10w">
        <div className="fr-container">
          <h1>Bonjour {user.firstName}</h1>

          {/* Bouton de sync manuelle */}
          {hasParcours && (
            <div className="fr-mb-4w">
              <button
                className="fr-btn fr-btn--secondary fr-btn--sm fr-mt-2w"
                onClick={syncNow}
                disabled={isSyncing}
              >
                {isSyncing
                  ? "Synchronisation..."
                  : "Rafraîchir le statut Démarches Simplifiées"}
              </button>
            </div>
          )}

          {/* Badge de statut DS synchronisé */}
          {hasParcours && (
            <span className="fr-badge fr-badge--info fr-mb-4w fr-ml-1w">
              {lastStatus === DSStatus.NON_ACCESSIBLE
                ? "Non accessible"
                : lastStatus === DSStatus.ACCEPTE
                  ? "Accepté"
                  : lastStatus === DSStatus.EN_INSTRUCTION
                    ? "En instruction"
                    : lastStatus === DSStatus.EN_CONSTRUCTION
                      ? "En construction"
                      : lastStatus === DSStatus.REFUSE
                        ? "Refusé"
                        : lastStatus === DSStatus.CLASSE_SANS_SUITE
                          ? "Classé sans suite"
                          : "Aucun dossier"}
            </span>
          )}

          {/* Pour debug */}
          {/* Indicateur de synchronisation */}
          {hasParcours && (
            <div className="fr-mb-2w">
              {isSyncing && (
                <span className="fr-text--sm">
                  Synchronisation avec Démarches Simplifiées...
                </span>
              )}
              <p>Statut {JSON.stringify(lastStatus)}</p>
              {lastSync && !isSyncing && (
                <span className="fr-text--sm fr-text--mention-grey">
                  Dernière synchronisation : {lastSync.toLocaleTimeString()}
                </span>
              )}
            </div>
          )}

          <div className="fr-grid-row fr-grid-row--gutters">
            <div className="fr-col-12 fr-col-md-8">
              {/* Cas ou on a les données RGA en session et on doit envoyer a Démarches Simplifiées */}
              {hasRGAData && hasParcours && <CalloutARemplir />}

              {/* Cas ou on a déja envoyé dans DS mais pas encore terminé  */}
              {hasParcours && lastStatus === DSStatus.EN_CONSTRUCTION && (
                <CalloutEligibiliteEnConstruction />
              )}

              {/* Cas ou c'est en instruction dans DS  */}
              {hasParcours && lastStatus === DSStatus.EN_INSTRUCTION && (
                <CalloutEnInstruction />
              )}
              {/* <CalloutARemplir />
              <CalloutDiagnostic />
              <CalloutEnInstruction /> */}
            </div>

            <div className="fr-col-12 fr-col-md-4 flex justify-center md:justify-end">
              <MaListe />
            </div>
          </div>
        </div>
      </section>

      {/* Étapes détaillées */}
      <StepDetailSection />

      {/* FAQ */}
      <FaqAccountSection />

      {/* Panneau de test latéral (dev uniquement) */}
      <DevTestSidebar />
    </>
  );
}
