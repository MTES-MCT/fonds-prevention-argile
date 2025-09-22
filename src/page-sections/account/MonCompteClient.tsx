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

export default function MonCompteClient() {
  const { user, isLoading, isLoggingOut } = useAuth();
  const { data: rgaData, hasData, isLoading: isLoadingRGA } = useRGAContext();
  const router = useRouter();
  const [isRedirecting] = useState(false);

  // Redirection si pas d'utilisateur ou mauvais rôle
  useEffect(() => {
    // Si on est en train de charger, rediriger ou se déconnecter, on ne fait rien
    if (isLoading || isLoadingRGA || isRedirecting || isLoggingOut) return;
  }, [isLoading, isLoadingRGA, user, router, isRedirecting, isLoggingOut]);

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

  // Si redirection en cours (pas d'user ou mauvais rôle) - ne rien afficher
  if (isRedirecting || !user) {
    return null;
  }

  // Contenu normal de la page
  return (
    <>
      <section className="fr-container-fluid fr-py-10w">
        <div className="fr-container">
          <h1>Bonjour {user.firstName}</h1>

          {hasData && (
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
