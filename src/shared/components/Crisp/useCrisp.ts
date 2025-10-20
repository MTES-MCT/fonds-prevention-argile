"use client";

import { WindowWithCrisp } from "@/types";
import { useEffect, useState } from "react";
import { isProduction } from "@/lib/config/env.config";

export const useCrisp = () => {
  const [isLoaded, setIsLoaded] = useState(false);
  const shouldRun = isProduction();

  useEffect(() => {
    // Ne pas exécuter en dehors de la production
    if (!shouldRun) return;

    const checkCrisp = () => {
      if (typeof window !== "undefined") {
        const windowWithCrisp = window as WindowWithCrisp;
        const crisp = windowWithCrisp.$crisp;
        if (crisp && typeof crisp.push === "function") {
          crisp.push(["safe", true]);
          console.log("[Crisp] Détecté et fonctionnel");
          setIsLoaded(true);
          return true;
        }
      }
      return false;
    };

    // Vérification immédiate
    if (checkCrisp()) return;

    // Vérification périodique pendant 10 secondes max
    let attempts = 0;
    const maxAttempts = 20;

    const interval = setInterval(() => {
      attempts++;
      console.log(
        `[Crisp] Tentative ${attempts}/${maxAttempts} - Vérification...`
      );

      if (checkCrisp() || attempts >= maxAttempts) {
        clearInterval(interval);
        if (attempts >= maxAttempts) {
          console.log("[Crisp] Timeout - Non détecté après 10 secondes");
        }
      }
    }, 500);

    return () => clearInterval(interval);
  }, [shouldRun]);

  /**
   * Ouvre le chat Crisp
   */
  const openChat = () => {
    if (!shouldRun) {
      console.log("[Crisp Debug] openChat appelé (mode dev)");
      return;
    }

    if (typeof window !== "undefined") {
      const windowWithCrisp = window as WindowWithCrisp;
      const crisp = windowWithCrisp.$crisp;
      if (crisp && typeof crisp.push === "function") {
        crisp.push(["do", "chat:open"]);
      } else {
        console.log("[Crisp] Impossible d'ouvrir le chat - Non disponible");
      }
    }
  };

  /**
   * Envoie un message silencieux dans Crisp (sans ouvrir le chat)
   */
  const sendMessage = (message: string) => {
    if (!shouldRun) {
      console.log(`[Crisp Debug] sendMessage: ${message} (mode dev)`);
      return;
    }

    if (typeof window !== "undefined") {
      const windowWithCrisp = window as WindowWithCrisp;
      const crisp = windowWithCrisp.$crisp;
      if (crisp && typeof crisp.push === "function") {
        crisp.push(["do", "message:send", ["text", message]]);
      } else {
        console.log("[Crisp] Impossible d'envoyer le message - Non disponible");
      }
    }
  };

  /**
   * Envoie un message ET ouvre le chat automatiquement
   */
  const promptUser = (message: string) => {
    if (!shouldRun) {
      console.log(`[Crisp Debug] promptUser: ${message} (mode dev)`);
      return;
    }

    if (typeof window !== "undefined") {
      const windowWithCrisp = window as WindowWithCrisp;
      const crisp = windowWithCrisp.$crisp;
      if (crisp && typeof crisp.push === "function") {
        crisp.push(["do", "message:send", ["text", message]]);
        crisp.push(["do", "chat:open"]);
      } else {
        console.log(
          "[Crisp] Impossible de prompter l'utilisateur - Non disponible"
        );
      }
    }
  };

  /**
   * Déclenche un événement personnalisé dans Crisp
   */
  const triggerEvent = (eventName: string) => {
    if (!shouldRun) {
      console.log(`[Crisp Debug] triggerEvent: ${eventName} (mode dev)`);
      return;
    }

    if (typeof window !== "undefined") {
      const windowWithCrisp = window as WindowWithCrisp;
      const crisp = windowWithCrisp.$crisp;
      if (crisp && typeof crisp.push === "function") {
        console.log(`[Crisp] Déclenchement de l'événement: ${eventName}`);
        crisp.push(["do", "trigger:run", [eventName]]);
      } else {
        console.log(
          `[Crisp] Impossible de déclencher l'événement ${eventName} - Non disponible`
        );
      }
    }
  };

  return {
    isLoaded: shouldRun ? isLoaded : false,
    openChat,
    sendMessage,
    promptUser,
    triggerEvent,
  };
};
