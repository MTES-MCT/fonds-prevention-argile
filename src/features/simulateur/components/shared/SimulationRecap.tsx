"use client";

import type { PartialRGASimulationData, RGASimulationData } from "@/shared/domain/types/rga-simulation.types";
import { asString, formatDateShort } from "@/shared/utils";
import { CHAMP_ADRESSE, SIMULATION_FIELDS } from "../../domain/value-objects/simulation-fields";
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
  const adresse = CHAMP_ADRESSE.getValue(simulation ?? {});
  const adresseModifiee = highlights?.[CHAMP_ADRESSE.key];
  const simulatedAt = asString(simulation?.simulatedAt);

  return (
    <div
      className="fr-p-3w"
      style={{
        background: "var(--background-default-grey)",
        // 2 px sur les deux cartes : le filet de 1 px du DSFR ne se voyait pas, et ne
        // l'épaissir que sur la carte retenue décalerait le contenu à chaque changement.
        border: `2px solid ${selectionne ? "var(--border-active-blue-france)" : "var(--border-default-grey)"}`,
      }}>
      {titre && (
        <h3 className="fr-h6 fr-mb-1w">
          {selectionne && (
            <span
              className="fr-icon-check-line fr-mr-1v"
              style={{ color: "var(--text-active-blue-france)" }}
              aria-hidden="true"
            />
          )}
          {titre}
          {estVersionActive && (
            <span className="fr-ml-1v" aria-label="version rattachée à votre compte">
              &#128994;
            </span>
          )}
          {simulatedAt && <> - {formatDateShort(simulatedAt)}</>}
        </h3>
      )}

      {selectionne && <p className="fr-text--xs fr-mb-2w">Version qui sera conservée</p>}

      {(verdict.isEligible || verdict.isNonEligible) && (
        <p className={`fr-badge fr-badge--sm ${verdict.isEligible ? "fr-badge--success" : "fr-badge--error"} fr-mb-2w`}>
          {verdict.isEligible ? "Éligible" : "Non éligible"}
        </p>
      )}

      <ul className="fr-ml-3w fr-text--sm fr-mb-0">
        {adresse != null && (
          <li className="fr-mb-2v">
            {CHAMP_ADRESSE.label}&nbsp;: {CHAMP_ADRESSE.formatValue(adresse)}
            {adresseModifiee && <span className={`${CLASSES_BADGE[adresseModifiee]} fr-ml-1v`}>modifiée</span>}
          </li>
        )}

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
