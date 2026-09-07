"use client";

import { useEffect, useRef } from "react";
import { useAuth } from "@/features/auth/client";
import { lierSimulationVulnerabiliteAuCompte } from "../actions/parcours-vulnerabilite-link.actions";

/**
 * Rattrape, une fois par session client, une simulation de vulnérabilité faite en anonyme
 * avant la connexion (cookie httpOnly, cf. `lierSimulationVulnerabiliteAuCompte`). Contrairement
 * à `useMigrateRGAToDB`, aucune dépendance au store de la feature vulnerabilite-rga : le cookie
 * porte l'état, pas le client — l'action est un no-op silencieux s'il n'y a rien à rattraper.
 */
export function useLinkVulnerabiliteSimulation() {
  const { isAuthenticated } = useAuth();
  const hasRunRef = useRef(false);

  useEffect(() => {
    if (!isAuthenticated || hasRunRef.current) return;
    hasRunRef.current = true;

    lierSimulationVulnerabiliteAuCompte().catch((error) => {
      console.error("[useLinkVulnerabiliteSimulation] Erreur:", error);
    });
  }, [isAuthenticated]);
}
