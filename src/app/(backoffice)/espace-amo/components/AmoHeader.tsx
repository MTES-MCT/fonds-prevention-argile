"use client";

import { useAuth } from "@/features/auth/client";

/**
 * En-tête de l'espace AMO
 * Affiche le nom de l'utilisateur connecté
 */
export function AmoHeader() {
  const { user } = useAuth();

  return (
    <div className="fr-py-4w fr-mb-2w" style={{ backgroundColor: "var(--background-alt-grey)" }}>
      <div className="fr-container">
        <div className="fr-grid-row fr-grid-row--middle">
          <div className="fr-col">
            <h1 className="fr-h3 fr-mb-0">
              <span className="fr-icon-building-fill fr-mr-2v" aria-hidden="true" />
              Espace AMO
            </h1>
            {user?.firstName && user?.lastName && (
              <p className="fr-text--sm fr-text--mention-grey fr-mb-0 fr-mt-1v">
                {user.firstName} {user.lastName}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
