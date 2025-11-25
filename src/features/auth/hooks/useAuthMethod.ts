"use client";

import { useAuth } from "../client";
import { AUTH_METHODS } from "../domain/value-objects";

/**
 * Hook pour vérifier si authentifié avec FranceConnect
 */
export function useIsFranceConnect() {
  const { user } = useAuth();
  return user?.authMethod === AUTH_METHODS.FRANCECONNECT;
}

/**
 * Hook pour vérifier si authentifié avec ProConnect
 */
export function useIsProConnect() {
  const { user } = useAuth();
  return user?.authMethod === AUTH_METHODS.PROCONNECT;
}
