"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";
import type { InfoLogement as InfoLogementType } from "@/features/backoffice/espace-agent/demandes/domain/types";
import { formatDate, formatMontant } from "@/shared/utils";
import { ALEA_COLORS } from "@/features/rga-map/domain/config";
import { RgaMapLegend } from "@/features/rga-map/components/RgaMapLegend";

// Import dynamique pour éviter les problèmes SSR avec MapLibre
const RgaMap = dynamic(() => import("@/features/rga-map/components/RgaMap").then((mod) => ({ default: mod.RgaMap })), {
  ssr: false,
  loading: () => (
    <div className="fr-py-6w fr-text--center">
      <p>Chargement de la carte...</p>
    </div>
  ),
});

interface DateIndemnisation {
  debut: Date;
  fin: Date;
  montant: number;
}

interface InfoLogementProps {
  logement: InfoLogementType;
  /** Adresse complète du logement (pour l'affichage sous la carte) */
  adresse?: string | null;
  /** Informations sur l'indemnisation passée (optionnel, enrichit l'affichage) */
  dateIndemnisation?: DateIndemnisation;
}

/**
 * Composant affichant les informations sur le logement, l'éligibilité et la localisation sur carte.
 */
export function InfoLogement({ logement, adresse, dateIndemnisation }: InfoLogementProps) {
  // Formater le texte d'indemnisation si disponible
  const formatIndemnisationText = (indemnisation: DateIndemnisation) => {
    const debutStr = formatDate(indemnisation.debut.toISOString());
    const finStr = formatDate(indemnisation.fin.toISOString());
    const montantStr = formatMontant(indemnisation.montant);
    return `INDEMNISÉ ENTRE ${debutStr} ET ${finStr} (${montantStr})`;
  };

  // Déterminer la couleur du badge de risque argile (selon ALEA_COLORS)
  const getRisqueArgileColor = (zone: "faible" | "moyen" | "fort"): string => {
    switch (zone) {
      case "fort":
        return ALEA_COLORS.fort;
      case "moyen":
        return ALEA_COLORS.moyen;
      case "faible":
        return ALEA_COLORS.faible;
    }
  };

  // Coordonnées pour la carte
  const coordinates = useMemo(() => {
    if (logement.lat && logement.lon) {
      return { lat: logement.lat, lon: logement.lon };
    }
    return undefined;
  }, [logement.lat, logement.lon]);

  return (
    <div
      className="bg-white p-6"
      style={{ background: "var(--background-default-grey)", border: "1px solid var(--border-default-grey)" }}>
      <div className="fr-mb-1w">
        <h3 className="fr-h5 fr-mb-1v">
          <span className="fr-icon-home-4-line fr-mr-2v" aria-hidden="true"></span>
          Logement & éligibilité
        </h3>
        <p className="fr-text--sm fr-text-mention--grey fr-mb-0 fr-ml-4w">
          Informations fournies en partie par le demandeur
        </p>
      </div>
      <ul className="fr-ml-3w fr-text--sm">
        {/* Risque argile */}
        {logement.zoneExposition && (
          <li className="fr-mb-2v">
            Risque argile{" "}
            <span
              className="fr-badge fr-badge--sm fr-badge--no-icon fr-text--bold"
              style={{
                backgroundColor: getRisqueArgileColor(logement.zoneExposition),
                color: "#2a2a2a",
              }}>
              {logement.zoneExposition.toUpperCase()}
            </span>
          </li>
        )}

        {logement.anneeConstruction && (
          <li className="fr-mb-2v">
            Année de construction{" "}
            <span className="fr-badge fr-badge--sm fr-badge--info fr-badge--no-icon">{logement.anneeConstruction}</span>
          </li>
        )}

        {logement.nombreNiveaux && (
          <li className="fr-mb-2v">
            Nombre de niveau{" "}
            <span className="fr-badge fr-badge--sm fr-badge--info fr-badge--no-icon">
              {logement.nombreNiveaux} {Number(logement.nombreNiveaux) > 1 ? "NIVEAUX" : "NIVEAU"}
            </span>
          </li>
        )}

        {logement.etatMaison && (
          <li className="fr-mb-2v">
            État de la maison{" "}
            <span className="fr-badge fr-badge--sm fr-badge--info fr-badge--no-icon">
              {logement.etatMaison.toUpperCase()}
            </span>
          </li>
        )}

        {logement.indemnisationPasseeRGA !== null && (
          <li className="fr-mb-2v">
            Indemnisation passée liée au RGA ? {/* Si indemnisé entre 2015 et 2025, afficher le badge de période */}
            {logement.indemnisationPasseeRGA && logement.indemnisationAvantJuillet2025 ? (
              <span className="fr-badge fr-badge--sm fr-badge--info fr-badge--no-icon">
                INDEMNISÉ ENTRE 01/07/15 ET 01/07/25
              </span>
            ) : dateIndemnisation ? (
              <span className="fr-badge fr-badge--sm fr-badge--yellow-tournesol fr-badge--no-icon">
                {formatIndemnisationText(dateIndemnisation)}
              </span>
            ) : (
              <span className="fr-badge fr-badge--sm fr-badge--info fr-badge--no-icon">
                {logement.indemnisationPasseeRGA ? "OUI" : "NON"}
              </span>
            )}
          </li>
        )}

        {/* Montant de l'indemnisation (si indemnisé entre 2015 et 2025 avec montant) */}
        {logement.indemnisationPasseeRGA &&
          logement.indemnisationAvantJuillet2025 &&
          logement.indemnisationAvantJuillet2015 === false &&
          logement.montantIndemnisation !== null && (
            <li className="fr-mb-2v">
              Montant de l&apos;indemnité{" "}
              <span className="fr-badge fr-badge--sm fr-badge--info fr-badge--no-icon">
                {formatMontant(logement.montantIndemnisation)}
              </span>
            </li>
          )}

        {logement.nombreHabitants && (
          <li className="fr-mb-2v">
            Habitants du logement{" "}
            <span className="fr-badge fr-badge--sm fr-badge--info fr-badge--no-icon">
              {logement.nombreHabitants} {logement.nombreHabitants > 1 ? "HABITANTS" : "HABITANT"}
            </span>
          </li>
        )}

        {logement.niveauRevenu && (
          <li className="fr-mb-2v">
            Revenus du foyer{" "}
            <span
              className={`fr-badge fr-badge--sm fr-badge--no-icon ${
                logement.niveauRevenu === "Très modeste"
                  ? "fr-badge--info fr-badge--no-icon"
                  : logement.niveauRevenu === "Modeste"
                    ? "fr-badge--yellow-tournesol"
                    : "fr-badge--purple-glycine"
              }`}>
              {logement.niveauRevenu === "Très modeste"
                ? "MÉNAGE TRÈS MODESTE"
                : logement.niveauRevenu === "Modeste"
                  ? "MÉNAGE MODESTE"
                  : logement.niveauRevenu.toUpperCase()}
            </span>
          </li>
        )}
      </ul>

      {/* Carte de localisation */}
      {coordinates && (
        <div className="fr-mt-2w">
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
      )}
    </div>
  );
}
