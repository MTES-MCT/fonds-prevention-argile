"use client";

import type { PartialRGASimulationData, RGASimulationData } from "@/shared/domain/types/rga-simulation.types";
import { asString, formatDateShort } from "@/shared/utils";
import { SIMULATION_FIELDS } from "../../domain/value-objects/simulation-fields";
import { evaluateSimulation } from "../../domain/services/eligibilite-archivage.service";

/** Signalement d'un champ : il diffère de la version de référence, et il bloque ou non. */
export type SimulationHighlight = "diff" | "bloquant";

interface SimulationRecapProps {
  simulation: RGASimulationData | PartialRGASimulationData | null;
  /** Titre de l'encart (modale d'arbitrage). Omis, l'en-tête se limite au verdict. */
  titre?: string;
  /** Pastille verte de la maquette, sur la version déjà rattachée au compte. */
  estVersionActive?: boolean;
  highlights?: Readonly<Record<string, SimulationHighlight>>;
  /** Rend l'encart sélectionnable (modale d'arbitrage). */
  selectionne?: boolean;
}

const CLASSES_BADGE: Record<SimulationHighlight | "neutre", string> = {
  neutre: "fr-badge fr-badge--sm fr-badge--no-icon",
  diff: "fr-badge fr-badge--sm fr-badge--no-icon fr-badge--info",
  bloquant: "fr-badge fr-badge--sm fr-badge--no-icon fr-badge--error",
};

/**
 * Récapitulatif lisible d'une simulation : adresse puis critères, en badges.
 * Partagé par la vue « mes données » du demandeur et les deux colonnes de la
 * modale d'arbitrage — les deux doivent montrer exactement les mêmes champs.
 */
export function SimulationRecap({
  simulation,
  titre,
  estVersionActive,
  highlights,
  selectionne,
}: SimulationRecapProps) {
  const verdict = evaluateSimulation(simulation);
  const adresse = construireAdresse(simulation);
  const simulatedAt = asString(simulation?.simulatedAt);

  return (
    <div
      className="fr-p-3w"
      style={{
        background: "var(--background-default-grey)",
        border: `1px solid ${selectionne ? "var(--border-active-blue-france)" : "var(--border-default-grey)"}`,
      }}>
      {titre && (
        <h3 className="fr-h6 fr-mb-1w">
          {titre}
          {estVersionActive && (
            <span className="fr-ml-1v" aria-label="version rattachée à votre compte">
              &#128994;
            </span>
          )}
          {simulatedAt && <> - {formatDateShort(simulatedAt)}</>}
        </h3>
      )}

      {(verdict.isEligible || verdict.isNonEligible) && (
        <p className={`fr-badge fr-badge--sm ${verdict.isEligible ? "fr-badge--success" : "fr-badge--error"} fr-mb-2w`}>
          {verdict.isEligible ? "Éligible" : "Non éligible"}
        </p>
      )}

      <ul className="fr-ml-3w fr-text--sm fr-mb-0">
        {adresse && <li className="fr-mb-2v">Adresse&nbsp;: {adresse}</li>}

        {SIMULATION_FIELDS.map((field) => {
          const valeur = field.getValue(simulation ?? {});
          if (valeur === undefined || valeur === null) return null;

          return (
            <li key={field.key} className="fr-mb-2v">
              {field.label}{" "}
              <span className={CLASSES_BADGE[highlights?.[field.key] ?? "neutre"]}>{field.formatValue(valeur)}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** « 97 rue de Notz, 36000 Châteauroux » — la commune complète l'adresse de voie. */
function construireAdresse(simulation: RGASimulationData | PartialRGASimulationData | null): string | null {
  const adresse = asString(simulation?.logement?.adresse);
  if (adresse) return adresse;
  return asString(simulation?.logement?.commune_nom) || null;
}
