"use client";

import { useContext } from "react";
import { RGAContext, RGAContextType } from "./RGAContext";

/**
 * Hook pour accéder au contexte RGA
 * Lève une erreur si utilisé en dehors du Provider
 */
export function useRGAContext(): RGAContextType {
  const context = useContext(RGAContext);

  if (!context) {
    throw new Error(
      "useRGAContext doit être utilisé à l'intérieur d'un RGAProvider. " +
        "Assurez-vous d'entourer votre composant avec <RGAProvider>."
    );
  }

  return context;
}

/**
 * Hook optionnel - retourne null si pas de Provider
 * Utile pour des composants qui peuvent fonctionner sans RGA
 */
export function useOptionalRGAContext(): RGAContextType | null {
  return useContext(RGAContext);
}
