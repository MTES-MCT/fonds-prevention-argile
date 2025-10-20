"use client";

import { useAuth } from "../client";

/**
 * Hook pour vérifier si authentifié avec FranceConnect
 */
export function useIsFranceConnect() {
  const { user } = useAuth();
  return user?.authMethod === "franceconnect";
}
