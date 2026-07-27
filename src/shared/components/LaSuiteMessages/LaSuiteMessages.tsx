"use client";

import { useEffect } from "react";
import { WindowWithLaSuiteWidget } from "@/shared/types";
import { getClientEnv, isDevelopment } from "@/shared/config/env.config";

const WIDGET_LOADER_URL = "https://static.suite.anct.gouv.fr/messages/widgets/loader.js";
const WIDGET_SCRIPT_URL = "https://static.suite.anct.gouv.fr/messages/widgets/feedback.js";
const WIDGET_API_URL = "https://messages.suite.anct.gouv.fr/api/v1.0/inbound/widget/";

export default function LaSuiteMessages() {
  useEffect(() => {
    // Ne pas initialiser le widget en local/docker (pas de channel dédié)
    if (isDevelopment()) return;

    try {
      const clientEnv = getClientEnv();
      const channelId = clientEnv.NEXT_PUBLIC_LASUITE_MESSAGES_CHANNEL_ID;

      if (typeof window === "undefined") return;

      if (!channelId || channelId.trim() === "") {
        console.error("[LaSuiteMessages] NEXT_PUBLIC_LASUITE_MESSAGES_CHANNEL_ID non configuré - widget désactivé");
        return;
      }

      const windowWithWidget = window as WindowWithLaSuiteWidget;

      // Éviter la double initialisation
      if (windowWithWidget._stmsg_widget) return;

      // loader.js lit/écrit exclusivement window._stmsg_widget (vérifié dans son code
      // source), pas "_lasuite_widget" comme indiqué dans l'exemple fourni par l'ANCT.
      windowWithWidget._stmsg_widget = [
        [
          "loader",
          "init",
          {
            label: "Donner votre avis",
            closeLabel: "Fermer le widget",
            params: {
              api: WIDGET_API_URL,
              channel: channelId,
              title: "Votre avis nous intéresse",
              placeholder: "Partagez votre retour...",
              emailPlaceholder: "Votre email...",
              submitText: "Envoyer",
              successText: "Merci pour votre retour !",
              closeLabel: "Fermer le formulaire de retour",
            },
            script: WIDGET_SCRIPT_URL,
            widget: "feedback",
          },
        ],
      ];

      const script = document.createElement("script");
      script.src = WIDGET_LOADER_URL;
      script.async = true;

      script.onerror = (error) => {
        console.error("[LaSuiteMessages] Erreur chargement script:", error);
      };

      document.head.appendChild(script);
    } catch (error) {
      console.error("[LaSuiteMessages] Erreur initialisation:", error);
    }
  }, []);

  return null;
}
