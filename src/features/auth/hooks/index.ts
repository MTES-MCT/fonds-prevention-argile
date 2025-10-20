"use client";

import { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { ROLES } from "../core/auth.constants";

/**
 * Hook pour vérifier si l'utilisateur est admin
 */
export function useIsAdmin() {
  const { user } = useAuth();
  return user?.role === ROLES.ADMIN;
}

/**
 * Hook pour vérifier si l'utilisateur est un particulier
 */
export function useIsParticulier() {
  const { user } = useAuth();
  return user?.role === ROLES.PARTICULIER;
}

/**
 * Hook pour vérifier un rôle spécifique
 */
export function useHasRole(role: string) {
  const { user } = useAuth();
  return user?.role === role;
}

/**
 * Hook pour vérifier si authentifié avec FranceConnect
 */
export function useIsFranceConnect() {
  const { user } = useAuth();
  return user?.authMethod === "franceconnect";
}

/**
 * Hook pour gérer le message de déconnexion
 */
export function useLogoutMessage() {
  const [showLogoutMessage, setShowLogoutMessage] = useState(false);

  useEffect(() => {
    if (localStorage.getItem("logout_success") === "true") {
      setShowLogoutMessage(true);
      localStorage.removeItem("logout_success");
    }
  }, []);

  const clearLogoutMessage = () => {
    setShowLogoutMessage(false);
  };

  return { showLogoutMessage, clearLogoutMessage };
}
