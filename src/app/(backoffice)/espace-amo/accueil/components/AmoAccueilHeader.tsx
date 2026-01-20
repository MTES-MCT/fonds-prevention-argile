"use client";

import { useAuth } from "@/features/auth/contexts/AuthContext";

export function AmoAccueilHeader() {
  const { user } = useAuth();

  return (
    <div className="fr-container fr-py-4w">
      {user?.firstName && user?.lastName && (
        <h1 className="fr-h1 fr-mb-0">Bonjour {user?.firstName || "Utilisateur"}</h1>
      )}
      <p className="fr-mt-2w fr-text--xl text-gray-500">Voici les dernières mises à jour</p>

      <div className="fr-card fr-enlarge-link">
        <div className="fr-card__body">
          <div className="fr-card__content">
            <h3 className="fr-card__title">
              <a href="[URL - à modifier]">Intitulé de la carte</a>
            </h3>
            <p className="fr-card__desc">
              Lorem ipsum dolor sit amet, consectetur adipiscing, incididunt, ut labore et dolore magna aliqua. Vitae
              sapien pellentesque habitant morbi tristique senectus et
            </p>
            <div className="fr-card__start"></div>
          </div>
        </div>
      </div>
    </div>
  );
}
