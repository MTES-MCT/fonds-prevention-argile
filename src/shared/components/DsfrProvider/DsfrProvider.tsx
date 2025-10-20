"use client";

import { useEffect } from "react";
import type { DsfrGlobal } from "@/types/global";

export default function DsfrProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    const initDsfr = async () => {
      // Seulement côté client
      if (typeof window === "undefined") return;

      try {
        // Configuration du DSFR
        const dsfrFunction = (() => {}) as unknown as DsfrGlobal;
        dsfrFunction.verbose = false;
        dsfrFunction.mode = "react";

        window.dsfr = dsfrFunction;

        // Import du module DSFR
        // @ts-expect-error - Le module DSFR n'a pas de déclarations TypeScript
        await import("@gouvfr/dsfr/dist/dsfr.module.min.js");

        // Attendre un peu que le module soit chargé
        await new Promise((resolve) => setTimeout(resolve, 100));

        // Démarrer DSFR
        if (window.dsfr?.start) {
          window.dsfr.start();
          console.log("[DSFR] Initialisé avec succès !");
        }
      } catch (error) {
        console.error("[DSFR] Échec de l'initialisation :", error);
      }
    };

    initDsfr();
  }, []);

  return <>{children}</>;
}
