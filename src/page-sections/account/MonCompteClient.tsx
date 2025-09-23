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

export default function MonCompteClient() {
  const { user, isLoading, isLoggingOut } = useAuth();
  const { hasData: hasRGAData, isLoading: isLoadingRGA } = useRGAContext();
  const router = useRouter();
  const [isRedirecting] = useState(false);
  const [showNoDataMessage, setShowNoDataMessage] = useState(false);
  const [hasParcours, setHasParcours] = useState(false);
  const [isCheckingParcours, setIsCheckingParcours] = useState(true);

  // Vérifier si l'utilisateur a un parcours en cours
  useEffect(() => {
    const checkParcours = async () => {
      if (user) {
        try {
          const result = await getParcoursStatus();
          console.log("result :>> ", result);

          // On considère qu'il y a un parcours si on a un état connu
          if (result.success && result.data?.state) {
            setHasParcours(true);
          }
        } catch (error) {
          console.error("Erreur lors de la vérification du parcours:", error);
        }
      }
      setIsCheckingParcours(false);
    };

    checkParcours();
  }, [user]);

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

  // Message si pas de données RGA ET pas de parcours
  if (showNoDataMessage) {
    return (
      <div className="fr-container fr-py-8w">
        <div className="fr-alert fr-alert--warning">
          <h3 className="fr-alert__title">Simulation requise</h3>
          <p>
            Vous devez d'abord remplir le simulateur d'éligibilité pour démarrer
            votre parcours.
          </p>
        </div>
        <div className="fr-btns-group fr-mt-3w">
          <button
            className="fr-btn fr-btn--primary"
            onClick={() => router.push("/simulateur")}
          >
            Aller au simulateur maintenant
          </button>
        </div>
      </div>
    );
  }

  // Si redirection en cours ou pas d'user - ne rien afficher
  if (isRedirecting || !user) {
    return null;
  }

  // Contenu normal de la page
  return (
    <>
      <section className="fr-container-fluid fr-py-10w">
        <div className="fr-container">
          <h1>Bonjour {user.firstName}</h1>

          {/* Afficher un badge si parcours en cours mais pas de données RGA */}
          {hasParcours && !hasRGAData && (
            <span className="fr-badge fr-badge--info fr-mb-4w">
              Parcours en cours
            </span>
          )}

          {/* TODO : Gestion état du badge / compte */}
          <span className="fr-badge fr-badge--new fr-mb-4w">
            En construction
          </span>

          <div className="fr-grid-row fr-grid-row--gutters">
            <div className="fr-col-12 fr-col-md-8">
              <CalloutARemplir />
              <CalloutDiagnostic />
              <CalloutEnInstruction />
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
