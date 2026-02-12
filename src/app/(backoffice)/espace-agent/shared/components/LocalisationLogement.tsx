"use client";

import dynamic from "next/dynamic";
import type { InfoLogement } from "@/features/backoffice/espace-agent/demandes/domain/types";
import { useMemo } from "react";
import { RgaMapLegend } from "@/features/rga-map/components/RgaMapLegend";

// Import dynamique pour éviter les problèmes SSR avec MapLibre
const RgaMap = dynamic(() => import("@/features/rga-map/components/RgaMap").then((mod) => ({ default: mod.RgaMap })), {
  ssr: false,
  loading: () => (
    <div className="fr-card fr-card--no-border fr-card--shadow">
      <div className="fr-card__body">
        <div className="fr-card__content">
          <p className="fr-text--center fr-py-6w">Chargement de la carte...</p>
        </div>
      </div>
    </div>
  ),
});

interface LocalisationLogementProps {
  logement: InfoLogement;
  adresse: string | null;
}

/**
 * Composant affichant la carte du logement avec zoom et sélection verrouillée
 */
export function LocalisationLogement({ logement, adresse }: LocalisationLogementProps) {
  const coordinates = useMemo(() => {
    if (logement.lat && logement.lon) {
      return { lat: logement.lat, lon: logement.lon };
    }
    return undefined;
  }, [logement.lat, logement.lon]);

  if (!coordinates) {
    return (
      <div className="fr-card fr-card--no-border fr-card--shadow">
        <div className="fr-card__body">
          <div className="fr-card__content">
            <h3 className="fr-card__title">
              <span className="fr-icon-map-pin-2-fill fr-icon--sm fr-mr-2v" aria-hidden="true"></span>
              Localisation du logement
            </h3>
            <p className="fr-text--sm fr-text-mention--grey">Aucune coordonnée disponible pour ce logement.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fr-card">
      <div className="fr-card__body">
        <div className="fr-card__content">
          <h3 className="fr-card__title">
            <span className="fr-icon-map-pin-2-line fr-mr-2v" aria-hidden="true"></span>
            Localisation du logement
          </h3>

          <div className="fr-card__desc">
            {/* Carte */}
            <div className="fr-mt-2w fr-mb-2w">
              <RgaMap
                center={coordinates}
                zoom={18}
                showMarker={true}
                locked={true}
                readOnly={true}
                initialRnbId={logement.rnbId ?? undefined}
                height="400px"
                padding="0"
              />
            </div>

            {/* Adresse et légende */}
            <div className="flex justify-between items-start fr-mt-2w">
              {adresse && (
                <p className="fr-badge fr-badge--sm fr-badge--blue-cumulus fr-icon-home-4-fill fr-badge--icon-left fr-m-0">
                  {adresse}
                </p>
              )}
              <RgaMapLegend />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
