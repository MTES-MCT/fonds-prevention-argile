"use client";

import { useEffect } from "react";
import { getClientEnv, isProduction } from "@/lib/config/env.config";
import { WindowWithCrisp } from "@/types";

export default function Crisp() {
  useEffect(() => {
    // Ne pas initialiser Crisp en dehors de la production
    if (!isProduction()) return;

    try {
      const clientEnv = getClientEnv();
      const websiteId = clientEnv.NEXT_PUBLIC_CRISP_WEBSITE_ID;

      console.log("[Crisp] Environment:", {
        isProduction: isProduction(),
        hasWebsiteId: !!websiteId,
      });

      if (typeof window === "undefined") {
        console.log("[Crisp] Window undefined");
        return;
      }

      if (!websiteId || websiteId.trim() === "") {
        console.log(
          "[Crisp] NEXT_PUBLIC_CRISP_WEBSITE_ID non configuré - Crisp désactivé"
        );
        return;
      }

      const windowWithCrisp = window as WindowWithCrisp;

      // Éviter la double initialisation
      if (windowWithCrisp.$crisp) {
        console.log("[Crisp] Déjà initialisé");
        return;
      }

      console.log("[Crisp] Initializing...", {
        websiteId: websiteId,
      });

      // Initialisation de Crisp
      windowWithCrisp.$crisp = [] as unknown as WindowWithCrisp["$crisp"];
      windowWithCrisp.CRISP_WEBSITE_ID = websiteId;

      const script = document.createElement("script");
      script.src = "https://client.crisp.chat/l.js";
      script.async = true;

      script.onload = () => {
        console.log("[Crisp] Script chargé avec succès !");
      };

      script.onerror = (error) => {
        console.log("[Crisp] Erreur chargement script:", error);
      };

      document.head.appendChild(script);
    } catch (error) {
      console.log("[Crisp] Erreur initialisation:", error);
    }
  }, []);

  if (!isProduction()) return null;

  return null;
}
