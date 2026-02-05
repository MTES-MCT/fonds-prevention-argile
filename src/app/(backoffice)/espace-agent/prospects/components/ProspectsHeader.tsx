"use client";

import { useAuth } from "@/features/auth/contexts/AuthContext";
import { StatTile } from "@/app/(backoffice)/espace-agent/shared";

interface ProspectsHeaderProps {
  nombreProspects: number;
}

export function ProspectsHeader({ nombreProspects }: ProspectsHeaderProps) {
  const { user } = useAuth();

  return (
    <div className="fr-container fr-py-4w">
      {user?.firstName && <h1 className="fr-h1 fr-mb-0">Bonjour {user.firstName}</h1>}
      <p className="fr-mt-2w fr-text--xl text-gray-500">Voici les dernières mises à jour</p>

      <div className="fr-grid-row fr-grid-row--gutters fr-mt-4w">
        <div className="fr-col-12 fr-col-md-6">
          <StatTile
            number={nombreProspects.toLocaleString("fr-FR")}
            label={`Nouveaux prospect${nombreProspects > 1 ? "s" : ""}`}
            description="🔥 À contacter en priorité"
          />
        </div>
      </div>
    </div>
  );
}
