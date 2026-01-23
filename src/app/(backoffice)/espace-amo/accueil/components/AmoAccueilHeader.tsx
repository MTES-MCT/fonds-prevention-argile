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
    </div>
  );
}
