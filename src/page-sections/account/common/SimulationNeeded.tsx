"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth/client";

export default function SimulationNeeded() {
  const { logout } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const handleLogoutAndRedirect = async () => {
    setIsLoading(true);
    await logout("/simulateur");
  };

  return (
    <div className="fr-callout fr-callout--yellow-moutarde fr-icon-warning-line">
      <h3 className="fr-callout__title">Simulation requise</h3>
      <p className="fr-callout__text">
        Pour continuer votre demande, vous devez d'abord remplir le simulateur
        d'éligibilité. Les iframes ne sont pas autorisées après une connexion
        FranceConnect.
      </p>
      <p className="fr-callout__text fr-text--sm">
        Vous allez être déconnecté puis redirigé vers le simulateur.
      </p>
      <button
        className="fr-btn fr-btn--icon-right fr-icon-arrow-right-s-line"
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
