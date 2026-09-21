"use client";

import { useParcours } from "@/features/parcours/core/context/useParcours";
import { getReglesAmo, type ReglesAmo } from "../domain/value-objects/departements-amo";
import { getCodeDepartementFromCodeInsee, normalizeCodeInsee } from "../utils/amo.utils";

/**
 * Règles d'AMO applicables au parcours courant, d'après le code INSEE de la commune
 * du demandeur. `null` tant que les données du parcours ne sont pas chargées.
 */
export function useReglesAmo(): ReglesAmo | null {
  const { parcours } = useParcours();
  const codeInsee = normalizeCodeInsee(parcours?.rgaSimulationData?.logement?.commune);
  if (!codeInsee) return null;
  return getReglesAmo(getCodeDepartementFromCodeInsee(codeInsee));
}
