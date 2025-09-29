"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth/client";

export default function SimulationNeededAlert() {
  const { logout } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const handleLogoutAndRedirect = async () => {
    setIsLoading(true);
    await logout("/simulateur");
  };

  return (
    <div className="fr-alert fr-alert--warning">
      <h3 className="fr-alert__title">Simulation requise</h3>
      <p>
        Pour continuer votre demande, vous devez d'abord remplir le simulateur
        d'éligibilité. Les iframes ne sont pas autorisées après une connexion
        FranceConnect.
      </p>
      <p className="fr-text--sm fr-mt-2w">
        Vous allez être déconnecté puis redirigé vers le simulateur.
      </p>
      <button
        className="fr-btn fr-btn--icon-right fr-mt-2w fr-icon-arrow-right-s-line"
        onClick={handleLogoutAndRedirect}
        disabled={isLoading}
      >
        {isLoading
          ? "Déconnexion..."
          : "Se déconnecter puis remplir le simulateur"}
      </button>
    </div>
  );
}
