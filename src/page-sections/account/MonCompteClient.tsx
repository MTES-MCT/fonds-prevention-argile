"use client";

import { useAuth } from "@/lib/auth/client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import MonCompteLoading from "../../components/Loading/Loading";
import FaqAccountSection from "./common/FaqAccountSection";
import MaListe from "./common/MaListe";
import StepDetailSection from "./common/StepDetailSection";
import CalloutARemplir from "./eligibilite/CalloutEligibiliteAFaire";
import CalloutDiagnostic from "./diagnostic/CalloutDiagnostic";
import CalloutEnInstruction from "./en-instruction/CalloutEnInstruction";
import { useRGAContext } from "@/lib/form-rga/session/useRGAContext";

// Panneau de test latéral (seulement en dev)
// import DevTestSidebar from "./test/DevTestSidebar";

const REDIRECT_DELAY_MS = 3000; // Délai avant redirection automatique si pas de données RGA

export default function MonCompteClient() {
  const { user, isLoading, isLoggingOut } = useAuth();
  const {
    data: rgaData,
    hasData: hasRGAData,
    isLoading: isLoadingRGA,
  } = useRGAContext();
  const router = useRouter();
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [showNoDataMessage, setShowNoDataMessage] = useState(false);

  // Redirection si pas de données RGA
  useEffect(() => {
    // Si on est en train de charger ou se déconnecter, on ne fait rien
    if (isLoading || isLoadingRGA || isLoggingOut || isRedirecting) return;

    // Si utilisateur connecté mais pas de données RGA
    if (user && !hasRGAData) {
      setShowNoDataMessage(true);
      setIsRedirecting(true);

      // Redirection après un délai pour laisser le temps de lire le message
      const redirectTimer = setTimeout(() => {
        router.push("/simulateur");
      }, REDIRECT_DELAY_MS);

      return () => clearTimeout(redirectTimer);
    }
  }, [isLoading, isLoadingRGA, user, hasRGAData, router, isLoggingOut]);

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
  if (isLoading || isLoadingRGA) {
    return <MonCompteLoading />;
  }

  // Message si pas de données RGA
  if (showNoDataMessage) {
    return (
      <div className="fr-container fr-py-8w">
        <div className="fr-alert fr-alert--warning">
          <h3 className="fr-alert__title">Simulation requise</h3>
          <p>
            Vous devez d'abord remplir le simulateur d'éligibilité avant
            d'accéder à votre compte.
          </p>
          <p className="fr-text--sm fr-mt-2w">
            Redirection automatique vers le simulateur dans quelques secondes...
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

          {hasRGAData && (
            <>
              <span className="fr-badge fr-badge--new fr-mb-4w">
                DONNES RGA RECUES
              </span>
              <details className="fr-mb-4w">
                <summary>Données RGA parsées</summary>
                <pre className="fr-text--xs">
                  {JSON.stringify(rgaData, null, 2)}
                </pre>
              </details>
            </>
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
      {/* <DevTestSidebar /> */}
    </>
  );
}
