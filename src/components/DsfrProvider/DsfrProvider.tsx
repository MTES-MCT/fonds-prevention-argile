"use client";

import { useEffect } from "react";

// Type pour l'objet DSFR global
interface DsfrGlobal {
  verbose: boolean;
  mode: string;
  start?: () => void;
  [key: string]: unknown; // Pour les autres propriétés du DSFR
}

declare global {
  interface Window {
    dsfr?: DsfrGlobal;
  }
}

export function DsfrProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Fonction pour initialiser DSFR
    const initDsfr = async () => {
      // Seulement côté client
      if (typeof window === "undefined") return;

      try {
        // Configuration du DSFR
        window.dsfr = {
          verbose: false,
          mode: "react",
        };

        // Import du module DSFR
        // @ts-expect-error - Le module DSFR n'a pas de déclarations TypeScript
        await import("@gouvfr/dsfr/dist/dsfr.module.min.js");

        // Attendre un peu que le module soit chargé
        await new Promise((resolve) => setTimeout(resolve, 100));

        // Démarrer DSFR
        if (window.dsfr?.start) {
          window.dsfr.start();
          console.log("DSFR initialized successfully");
        }
      } catch (error) {
        console.error("DSFR initialization failed:", error);
      }
    };

    // Lancer l'initialisation
    initDsfr();
  }, []); // Seulement au premier mount

  return <>{children}</>;
}
