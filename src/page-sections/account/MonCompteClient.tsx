"use client";

import { useAuth, ROLES } from "@/lib/auth/client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import MonCompteLoading from "../../components/Loading/Loading";
import FaqAccountSection from "./common/FaqAccountSection";
import MaListe from "./common/MaListe";
import StepDetailSection from "./common/StepDetailSection";
import CalloutARemplir from "./eligibilite/CalloutEligibiliteAFaire";
import CalloutDiagnostic from "./diagnostic/CalloutDiagnostic";
import CalloutEnInstruction from "./en-instruction/CalloutEnInstruction";

export default function MonCompteClient() {
  const { user, isLoading, isLoggingOut } = useAuth();
  const router = useRouter();
  const [isRedirecting, setIsRedirecting] = useState(false);

  // Redirection si pas d'utilisateur ou mauvais rôle
  useEffect(() => {
    // Si on est en train de charger, rediriger ou se déconnecter, on ne fait rien
    if (isLoading || isRedirecting || isLoggingOut) return;

    // Si pas d'utilisateur ou mauvais rôle
    if (!user || user.role !== ROLES.PARTICULIER) {
      setIsRedirecting(true);
      router.push("/connexion");
    }
  }, [isLoading, user, router, isRedirecting, isLoggingOut]);

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
    </>
  );
}
