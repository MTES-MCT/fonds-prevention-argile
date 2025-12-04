"use client";

import { useRGAStore, selectTempRgaData, selectIsHydrated } from "../stores";
import { validateRGAData } from "../services/validator.service";
import { useAuth } from "@/features/auth/client";
import { useOptionalParcours } from "@/features/parcours/core/context/useParcours";

/**
 * Hook pour interagir avec le simulateur RGA
 *
 * Architecture :
 * - AVANT connexion : Utilise Zustand (localStorage) comme cache temporaire
 * - APRÈS connexion : Utilise les données de la base (via ParcoursContext)
 *
 * Le hook fait l'arbitrage automatique selon l'état d'authentification
 */
export function useSimulateurRga() {
  const { isAuthenticated } = useAuth();
  const parcoursData = useOptionalParcours();
  const parcours = parcoursData?.parcours ?? null;

  // Données du store Zustand (localStorage) - cache temporaire pré-auth
  const tempRgaData = useRGAStore(selectTempRgaData);
  const isHydrated = useRGAStore(selectIsHydrated);

  // Actions (toujours depuis le store Zustand)
  const saveRGA = useRGAStore((state) => state.saveRGA);
  const clearRGA = useRGAStore((state) => state.clearRGA);

  // Connecté + données en base → utiliser la base (source de vérité)
  // Sinon → utiliser localStorage (cache temporaire)
  const rgaData = isAuthenticated && parcours?.rgaSimulationData ? parcours.rgaSimulationData : tempRgaData;

  // Helper pour vérifier si les données sont valides
  const hasValidData = (): boolean => {
    if (!rgaData) return false;
    if (Object.keys(rgaData).length === 0) return false;
    if (!rgaData.logement) return false;
    return true;
  };

  // Pendant l'hydratation (SSR → Client)
  if (!isHydrated) {
    return {
      data: undefined,
      isLoading: true,
      hasData: undefined,
      saveRGA,
      updateRGA: saveRGA,
      clearRGA,
      validateRGAData,
    };
  }

  return {
    data: rgaData, // Arbitrage automatique : DB si connecté, sinon localStorage
    isLoading: false,
    hasData: hasValidData(),
    saveRGA,
    updateRGA: saveRGA,
    clearRGA,
    validateRGAData,
  };
}
