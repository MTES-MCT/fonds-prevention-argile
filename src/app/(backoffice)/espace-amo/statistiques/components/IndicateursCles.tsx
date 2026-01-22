"use client";

import { StatTile } from "../../shared";
import type { AmoIndicateursCles } from "@/features/backoffice/espace-amo/statistiques/domain/types";

interface IndicateursClesProps {
  indicateurs: AmoIndicateursCles;
}

/**
 * Composant affichant les indicateurs clés de l'AMO
 */
export function IndicateursCles({ indicateurs }: IndicateursClesProps) {
  return (
    <div className="fr-mb-6w">
      <h2 className="fr-h4 fr-mb-1w">Indicateurs clés</h2>
      <p className="fr-text-mention--grey fr-mb-3w">Sur la période</p>

      <div className="fr-grid-row fr-grid-row--gutters">
        <div className="fr-col-12 fr-col-md-6">
          <StatTile
            number={indicateurs.nombreDossiersEnCoursAccompagnement.toLocaleString("fr-FR")}
            label="Dossiers en cours d'accompagnement"
          />
        </div>
        <div className="fr-col-12 fr-col-md-6">
          <StatTile
            number={indicateurs.nombreDemandesAccompagnement.total.toLocaleString("fr-FR")}
            label={`Demandes d'accompagnement traitées (${indicateurs.nombreDemandesAccompagnement.acceptees} acceptées - ${indicateurs.nombreDemandesAccompagnement.refusees} refusées)`}
          />
        </div>
      </div>
    </div>
  );
}
