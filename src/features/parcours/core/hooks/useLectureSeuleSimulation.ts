"use client";

import { useParcours } from "../context/useParcours";
import { aRenduSaDecision } from "@/features/parcours/amo/domain/value-objects";
import { Step } from "@/shared/domain/value-objects/step.enum";
import { raisonLectureSeule, type RaisonLectureSeule } from "../domain/value-objects/edition-simulation";

/**
 * Pourquoi la simulation du compte n'est plus modifiable — `null` si elle l'est encore.
 * Miroir client de `chargerEtatEditionSimulation` : les libellés (« Voir » plutôt que
 * « Modifier »), l'arbitrage et la page d'édition doivent dire la même chose, et la
 * barrière reste côté serveur.
 */
export function useLectureSeuleSimulation(): RaisonLectureSeule | null {
  const { parcours, statutAmo, getDSStatusByStep } = useParcours();

  if (!parcours) return null;

  return raisonLectureSeule({
    simulationCorrigeeParAgent: parcours.simulationCorrigeeParAgent,
    decisionAmoRendue: aRenduSaDecision(statutAmo),
    eligibiliteDsStatus: getDSStatusByStep(Step.ELIGIBILITE) ?? null,
  });
}
