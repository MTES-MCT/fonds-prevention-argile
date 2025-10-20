"use client";

import { useContext } from "react";
import { RGAContext } from "./RGAContext";
import { RGAContextType } from "./RGAContext.types";

/**
 * Hook pour accéder au contexte RGA
 * Lève une erreur si utilisé hors du Provider
 */
export function useRGAContext(): RGAContextType {
  const context = useContext(RGAContext);

  if (!context) {
    throw new Error(
      "useRGAContext doit être utilisé à l'intérieur d'un RGAProvider"
    );
  }

  return context;
}

/**
 * Hook optionnel - retourne null si pas de Provider
 */
export function useOptionalRGAContext(): RGAContextType | null {
  return useContext(RGAContext);
}
