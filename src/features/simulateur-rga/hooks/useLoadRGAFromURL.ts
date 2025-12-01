"use client";

import { useEffect, useRef } from "react";
import { useRGAStore } from "../stores";
import { decryptRGAData } from "../actions/decrypt-rga-data.actions";
import { createDebugLogger } from "@/shared/utils";

const debug = createDebugLogger("LOAD_RGA_URL");

/**
 * Hook pour charger les données RGA depuis l'URL (mode embed)
 * Détecte #d=xxx dans l'URL, déchiffre et sauvegarde dans Zustand
 * À utiliser sur la page /connexion
 */
export function useLoadRGAFromURL() {
  const saveRGA = useRGAStore((state) => state.saveRGA);
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    if (hasLoadedRef.current) return;
    if (typeof window === "undefined") return;

    const hash = window.location.hash;
    if (!hash.startsWith("#d=")) {
      debug.log("[useLoadRGAFromURL] No hash data found");
      return;
    }

    hasLoadedRef.current = true;
    const encrypted = hash.replace("#d=", "");

    debug.log("[useLoadRGAFromURL] Found encrypted data, decrypting...");

    const decrypt = async () => {
      try {
        const result = await decryptRGAData(encrypted);

        if (result.success && result.data) {
          debug.log("[useLoadRGAFromURL] Decryption successful, saving to store");
          saveRGA(result.data);

          // Nettoyer l'URL
          window.history.replaceState({}, "", window.location.pathname);
        } else {
          console.error("[useLoadRGAFromURL] Decryption failed:", !result.success && result.error);
        }
      } catch (error) {
        console.error("[useLoadRGAFromURL] Exception:", error);
      }
    };

    decrypt();
  }, [saveRGA]);
}
