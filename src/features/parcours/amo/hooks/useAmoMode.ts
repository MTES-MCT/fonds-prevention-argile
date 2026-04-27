"use client";

import { useParcours } from "@/features/parcours/core/context/useParcours";
import { AmoMode, getAmoMode } from "../domain/value-objects/departements-amo";
import { getCodeDepartementFromCodeInsee, normalizeCodeInsee } from "../utils/amo.utils";

/**
 * Résout le mode AMO applicable au parcours courant en se basant sur le code INSEE
 * de la commune du demandeur (champ `rgaSimulationData.logement.commune`).
 *
 * Retourne null tant que les données du parcours ne sont pas chargées.
 */
export function useAmoMode(): AmoMode | null {
  const { parcours } = useParcours();
  const codeInsee = normalizeCodeInsee(parcours?.rgaSimulationData?.logement?.commune);
  if (!codeInsee) return null;
  return getAmoMode(getCodeDepartementFromCodeInsee(codeInsee));
}
