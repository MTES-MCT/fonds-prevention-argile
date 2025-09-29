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
    <div className="fr-container fr-background-alt--grey fr-px-md-0">
      <div className="fr-grid-row fr-grid-row-gutters fr-grid-row--center fr-p-20v">
        <div className="fr-col-12 fr-col-md-8 fr-col-lg-6 fr-mt-2w">
          <div className="fr-alert fr-alert--error">
            <h3 className="fr-alert__title">Éligibilité requise</h3>
            <p>
              Pour continuer votre demande, vous devez d'abord remplir le
              simulateur d'éligibilité.
            </p>
          </div>

          <div className="container fr-mt-4w">
            <p>
              Pour des questions de sécurité, vous allez être déconnecté de
              votre compte avant d'être redirigé vers le simulateur.
            </p>
            <button
              className="fr-btn fr-btn--icon-right fr-mt-2w fr-icon-arrow-right-s-line"
              onClick={handleLogoutAndRedirect}
              disabled={isLoading}
            >
              {isLoading ? "Déconnexion..." : "Remplir le simulateur"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
