"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";
import Link from "next/link";
import type {
  InfoLogement as InfoLogementType,
  AgentEditInfo,
} from "@/features/backoffice/espace-agent/demandes/domain/types";
import { formatDate, formatDateTime, formatMontant } from "@/shared/utils";
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
  /** Lien vers l'édition des données de simulation */
  editSimulationHref?: string;
  /** Informations sur les modifications agent (pour afficher le diff) */
  agentEditInfo?: AgentEditInfo | null;
}

/**
 * Helper : affiche un badge de valeur avec diff si le champ a été modifié par un agent.
 * - Si `originalValue` existe : badge gris (ancien) → badge bleu (nouveau)
 * - Sinon : badge bleu simple (comportement actuel)
 */
function FieldValue({
  fieldKey,
  children,
  className,
  style,
  agentEditInfo,
}: {
  fieldKey: string;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  agentEditInfo?: AgentEditInfo | null;
}) {
  const originalValue = agentEditInfo?.originalDisplayValues?.[fieldKey];

  if (!originalValue) {
    // Pas de modification → badge simple
    return (
      <span className={className} style={style}>
        {children}
      </span>
    );
  }

  // Modification agent → ancien → nouveau
  return (
    <>
      <span
        className="fr-badge fr-badge--sm fr-badge--no-icon"
        style={{
          backgroundColor: "var(--background-contrast-grey)",
          color: "var(--text-mention-grey)",
        }}>
        {originalValue}
      </span>
      <span className="fr-mx-1v" aria-hidden="true">
        →
      </span>
      <span className={className} style={style}>
        {children}
      </span>
    </>
  );
}

/**
 * Composant affichant les informations sur le logement, l'éligibilité et la localisation sur carte.
 */
export function InfoLogement({
  logement,
  adresse,
  dateIndemnisation,
  editSimulationHref,
  agentEditInfo,
}: InfoLogementProps) {
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
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <h3 className="fr-h5 fr-mb-1v">
            <span className="fr-icon-home-4-line fr-mr-2v" aria-hidden="true"></span>
            Logement & éligibilité
          </h3>
          {editSimulationHref && (
            <Link
              href={editSimulationHref}
              className="fr-link fr-icon-arrow-right-line fr-link--icon-right fr-text--sm">
              Modifier les infos
            </Link>
          )}
        </div>
        <p className="fr-text--sm fr-text-mention--grey fr-mb-0 fr-ml-4w">
          Informations fournies en partie par le demandeur
        </p>
      </div>

      {/* Bandeau de modification agent */}
      {agentEditInfo && (
        <div className="fr-alert fr-alert--info fr-mb-2w">
          <p className="fr-text--sm fr-mb-0">
            Données mises à jour : {formatDateTime(agentEditInfo.editedAt.toISOString())} • {agentEditInfo.agentPrenom}{" "}
            {agentEditInfo.agentNom} • {agentEditInfo.nombreModifications}{" "}
            {agentEditInfo.nombreModifications > 1 ? "modifications" : "modification"}
          </p>
        </div>
      )}

      <ul className="fr-ml-3w fr-text--sm">
        {/* Risque argile */}
        {logement.zoneExposition && (
          <li className="fr-mb-2v">
            Risque argile{" "}
            <FieldValue
              fieldKey="zoneExposition"
              agentEditInfo={agentEditInfo}
              className="fr-badge fr-badge--sm fr-badge--no-icon fr-text--bold"
              style={{
                backgroundColor: getRisqueArgileColor(logement.zoneExposition),
                color: "#2a2a2a",
              }}>
              {logement.zoneExposition.toUpperCase()}
            </FieldValue>
          </li>
        )}

        {logement.anneeConstruction && (
          <li className="fr-mb-2v">
            Année de construction{" "}
            <FieldValue
              fieldKey="anneeConstruction"
              agentEditInfo={agentEditInfo}
              className="fr-badge fr-badge--sm fr-badge--info fr-badge--no-icon">
              {logement.anneeConstruction}
            </FieldValue>
          </li>
        )}

        {logement.nombreNiveaux && (
          <li className="fr-mb-2v">
            Nombre de niveau{" "}
            <FieldValue
              fieldKey="nombreNiveaux"
              agentEditInfo={agentEditInfo}
              className="fr-badge fr-badge--sm fr-badge--info fr-badge--no-icon">
              {logement.nombreNiveaux} {Number(logement.nombreNiveaux) > 1 ? "NIVEAUX" : "NIVEAU"}
            </FieldValue>
          </li>
        )}

        {logement.etatMaison && (
          <li className="fr-mb-2v">
            État de la maison{" "}
            <FieldValue
              fieldKey="etatMaison"
              agentEditInfo={agentEditInfo}
              className="fr-badge fr-badge--sm fr-badge--info fr-badge--no-icon">
              {logement.etatMaison.toUpperCase()}
            </FieldValue>
          </li>
        )}

        {logement.indemnisationPasseeRGA !== null && (
          <li className="fr-mb-2v">
            Indemnisation passée liée au RGA ?{" "}
            {logement.indemnisationPasseeRGA && logement.indemnisationAvantJuillet2025 ? (
              <FieldValue
                fieldKey="indemnisationPasseeRGA"
                agentEditInfo={agentEditInfo}
                className="fr-badge fr-badge--sm fr-badge--info fr-badge--no-icon">
                INDEMNISÉ ENTRE 01/07/15 ET 01/07/25
              </FieldValue>
            ) : dateIndemnisation ? (
              <FieldValue
                fieldKey="indemnisationPasseeRGA"
                agentEditInfo={agentEditInfo}
                className="fr-badge fr-badge--sm fr-badge--yellow-tournesol fr-badge--no-icon">
                {formatIndemnisationText(dateIndemnisation)}
              </FieldValue>
            ) : (
              <FieldValue
                fieldKey="indemnisationPasseeRGA"
                agentEditInfo={agentEditInfo}
                className="fr-badge fr-badge--sm fr-badge--info fr-badge--no-icon">
                {logement.indemnisationPasseeRGA ? "OUI" : "NON"}
              </FieldValue>
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
              <FieldValue
                fieldKey="montantIndemnisation"
                agentEditInfo={agentEditInfo}
                className="fr-badge fr-badge--sm fr-badge--info fr-badge--no-icon">
                {formatMontant(logement.montantIndemnisation)}
              </FieldValue>
            </li>
          )}

        {logement.nombreHabitants && (
          <li className="fr-mb-2v">
            Habitants du logement{" "}
            <FieldValue
              fieldKey="nombreHabitants"
              agentEditInfo={agentEditInfo}
              className="fr-badge fr-badge--sm fr-badge--info fr-badge--no-icon">
              {logement.nombreHabitants} {logement.nombreHabitants > 1 ? "HABITANTS" : "HABITANT"}
            </FieldValue>
          </li>
        )}

        {logement.niveauRevenu && (
          <li className="fr-mb-2v">
            Revenus du foyer{" "}
            <FieldValue
              fieldKey="niveauRevenu"
              agentEditInfo={agentEditInfo}
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
            </FieldValue>
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
