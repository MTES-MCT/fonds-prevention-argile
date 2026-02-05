"use client";

import { useAuth } from "@/features/auth/contexts/AuthContext";
import { StatTile } from "@/app/(backoffice)/espace-agent/shared";

interface ProspectsHeaderProps {
  nombreProspects: number;
  hasAmoDisponible: boolean;
}

export function ProspectsHeader({ nombreProspects, hasAmoDisponible }: ProspectsHeaderProps) {
  const { user } = useAuth();

  return (
    <div className="fr-container fr-py-4w">
      {user?.firstName && <h1 className="fr-h1 fr-mb-0">Bonjour {user.firstName}</h1>}
      <p className="fr-mt-2w fr-text--xl text-gray-500">Voici les dernières mises à jour</p>

      {!hasAmoDisponible && (
        <div className="fr-alert fr-alert--info fr-mt-4w">
          <h3 className="fr-alert__title">Aucun AMO disponible</h3>
          <p>
            À ce jour, aucun Assistant à Maîtrise d&apos;Ouvrage n&apos;est disponible dans votre département.
            N&apos;hésitez pas à contacter les demandeurs pour les informer et les faire patienter.
          </p>
        </div>
      )}

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
