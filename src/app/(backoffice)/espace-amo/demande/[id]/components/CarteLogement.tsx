"use client";

import dynamic from "next/dynamic";
import type { InfoLogement } from "@/features/backoffice/espace-amo/demande/domain/types";
import { useMemo } from "react";

// Import dynamique pour éviter les problèmes SSR avec MapLibre
const RgaMap = dynamic(
  () => import("@/features/rga-map/components/RgaMap").then((mod) => ({ default: mod.RgaMap })),
  {
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
  }
);

interface CarteLogementProps {
  logement: InfoLogement;
  adresse: string | null;
}

/**
 * Composant affichant la carte du logement avec zoom et sélection verrouillée
 */
export function CarteLogement({ logement, adresse }: CarteLogementProps) {
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
    <div className="fr-card fr-card--no-border fr-card--shadow">
      <div className="fr-card__body">
        <div className="fr-card__content">
          <h3 className="fr-card__title">
            <span className="fr-icon-map-pin-2-fill fr-icon--sm fr-mr-2v" aria-hidden="true"></span>
            Localisation du logement
          </h3>
          {adresse && <p className="fr-text--sm fr-mb-2w">{adresse}</p>}
          <div className="fr-mt-2w">
            <RgaMap
              center={coordinates}
              zoom={17}
              showMarker={true}
              locked={true}
              readOnly={false}
              height="400px"
              padding="0"
            />
          </div>
          <div className="fr-badge-group fr-mt-2w">
            <span className="fr-badge fr-badge--sm fr-badge--info">
              <span className="fr-icon-lock-fill fr-icon--sm fr-mr-1v" aria-hidden="true"></span>
              Sélection verrouillée
            </span>
            {logement.codeInsee && <span className="fr-badge fr-badge--sm">INSEE : {logement.codeInsee}</span>}
            {logement.rnbId && (
              <span className="fr-badge fr-badge--sm" title="Identifiant Référentiel National des Bâtiments">
                RNB : {logement.rnbId.substring(0, 8)}...
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
