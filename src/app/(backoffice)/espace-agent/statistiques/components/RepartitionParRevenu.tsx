"use client";

import { RepartitionCardTile } from "../../shared";
import type { RepartitionParRevenu as RepartitionParRevenuType } from "@/features/backoffice/espace-agent/statistiques/domain/types";

interface RepartitionParRevenuProps {
  repartition: RepartitionParRevenuType;
}

/**
 * Composant affichant la répartition des dossiers par catégorie de revenus
 * avec 3 cartes : Très modeste, Modeste, Intermédiaire
 *
 * Note: Les ménages dans la catégorie "supérieure" sont exclus du dispositif
 */
export function RepartitionParRevenu({ repartition }: RepartitionParRevenuProps) {
  return (
    <div className="fr-mb-6w">
      <h2 className="fr-h4 fr-mb-1w">Répartition par revenus</h2>
      <p className="fr-text-mention--grey fr-mb-3w">
        Les ménages dans la catégorie &quot;supérieure&quot; sont exclus du dispositif
      </p>

      <div className="fr-grid-row fr-grid-row--gutters">
        <div className="fr-col-12 fr-col-md-4">
          <RepartitionCardTile
            number={repartition.tresModeste}
            label="Très modeste"
            badgeSeverity="fr-badge--blue-cumulus"
          />
        </div>
        <div className="fr-col-12 fr-col-md-4">
          <RepartitionCardTile number={repartition.modeste} label="Modeste" badgeSeverity="fr-badge--yellow-moutarde" />
        </div>
        <div className="fr-col-12 fr-col-md-4">
          <RepartitionCardTile
            number={repartition.intermediaire}
            label="Intermédiaire"
            badgeSeverity="fr-badge--pink-tuile"
          />
        </div>
      </div>
    </div>
  );
}
