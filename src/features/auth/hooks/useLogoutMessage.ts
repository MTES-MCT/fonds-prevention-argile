"use client";

import { useEffect, useState } from "react";

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
