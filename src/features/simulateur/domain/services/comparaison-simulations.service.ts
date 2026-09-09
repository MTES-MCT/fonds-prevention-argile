import type { PartialRGASimulationData, RGASimulationData } from "@/shared/domain/types/rga-simulation.types";
import { SIMULATION_FIELDS_BY_KEY, diffSimulationFields } from "../value-objects/simulation-fields";
import { evaluateSimulation, type EligibiliteVerdict } from "./eligibilite-archivage.service";

type SimulationLike = RGASimulationData | PartialRGASimulationData;

/** Comment signaler un champ dans le récapitulatif de la version candidate. */
export type SignalementChamp = "diff" | "bloquant";

export interface ComparaisonSimulations {
  /** Clés des champs dont la valeur change entre les deux versions. */
  champsDifferents: string[];
  /** Signalement par champ, pour le récapitulatif de la version candidate. */
  signalements: Record<string, SignalementChamp>;
  verdictActive: EligibiliteVerdict;
  verdictCandidate: EligibiliteVerdict;
  /** Les deux versions ne donnent pas le même droit au dispositif. */
  verdictsDivergent: boolean;
  /** Rien ne distingue les deux versions : aucun arbitrage à demander. */
  identiques: boolean;
}

/**
 * Compare la simulation déjà rattachée au compte à celle que le demandeur vient
 * de faire, pour lui présenter un choix informé.
 *
 * Un champ est « bloquant » quand il diffère **et** que le critère qu'il porte
 * échoue dans la version candidate : c'est celui qui lui coûte son éligibilité,
 * et le seul à mériter le rouge.
 */
export function comparerSimulations(
  active: SimulationLike | null | undefined,
  candidate: SimulationLike | null | undefined
): ComparaisonSimulations {
  const verdictActive = evaluateSimulation(active);
  const verdictCandidate = evaluateSimulation(candidate);
  const champsDifferents = diffSimulationFields(active, candidate);

  const checksCandidate = verdictCandidate.result?.checks;
  const signalements: Record<string, SignalementChamp> = {};
  for (const cle of champsDifferents) {
    const critere = SIMULATION_FIELDS_BY_KEY[cle]?.checkKey;
    signalements[cle] = critere && checksCandidate?.[critere] === false ? "bloquant" : "diff";
  }

  return {
    champsDifferents,
    signalements,
    verdictActive,
    verdictCandidate,
    // Deux simulations incomplètes sans critère tranché ne divergent pas : rien à signaler.
    verdictsDivergent:
      verdictActive.isEligible !== verdictCandidate.isEligible ||
      verdictActive.isNonEligible !== verdictCandidate.isNonEligible,
    identiques: champsDifferents.length === 0,
  };
}
