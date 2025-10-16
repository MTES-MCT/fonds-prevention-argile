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

      if (typeof window === "undefined") {
        console.log("[Crisp] Erreur : Window undefined");
        return;
      }

      if (!websiteId || websiteId.trim() === "") {
        console.error(
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

      // Initialisation de Crisp
      windowWithCrisp.$crisp = [] as unknown as WindowWithCrisp["$crisp"];
      windowWithCrisp.CRISP_WEBSITE_ID = websiteId;

      const script = document.createElement("script");
      script.src = "https://client.crisp.chat/l.js";
      script.async = true;

      script.onload = () => {
        console.log("[Crisp] Initialisé avec succès !");
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
