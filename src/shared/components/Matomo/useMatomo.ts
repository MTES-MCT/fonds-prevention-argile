import { isProduction, isDev } from "@/shared/config/env.config";
import { MatomoEvent } from "@/shared/constants";
import { push } from "@socialgouv/matomo-next";

interface UseMatomo {
  trackEvent: (eventName: MatomoEvent, additionalData?: string) => void;
  trackPageView: (customUrl?: string) => void;
  enableHeatmaps: () => void;
  isEnabled: boolean;
}

const isDebugMatomo = (): boolean => {
  return process.env.NEXT_PUBLIC_DEBUG_MATOMO === "true";
};

export function useMatomo(): UseMatomo {
  const isEnabled = isProduction();
  const debugMode = isDebugMatomo() || isDev();

  const logDebug = (message: string, data?: Record<string, unknown>) => {
    if (debugMode) {
      if (data) {
        console.log(`[Matomo Debug] ${message}`, data);
      } else {
        console.log(`[Matomo Debug] ${message}`);
      }
    }
  };

  const trackEvent = (eventName: MatomoEvent, additionalData?: string) => {
    logDebug("trackEvent", {
      eventName,
      additionalData,
      isEnabled,
      willSend: isEnabled,
    });

    if (!isEnabled) {
      return;
    }

    try {
      push(["trackEvent", "User Action", eventName, additionalData]);
      logDebug(`Event envoyé: ${eventName}`);
    } catch (error) {
      console.warn("[Matomo] Erreur tracking:", error);
    }
  };

  const trackPageView = (customUrl?: string) => {
    logDebug("trackPageView", {
      customUrl: customUrl || "current page",
      isEnabled,
      willSend: isEnabled,
    });

    if (!isEnabled) {
      return;
    }

    try {
      if (customUrl) {
        push(["setCustomUrl", customUrl]);
      }
      push(["trackPageView"]);
      logDebug(`Page view envoyée: ${customUrl || "current page"}`);
    } catch (error) {
      console.warn("[Matomo] Erreur page view:", error);
    }
  };

  const enableHeatmaps = () => {
    logDebug("enableHeatmaps", { isEnabled, willSend: isEnabled });

    if (!isEnabled) {
      return;
    }

    try {
      push(["HeatmapSessionRecording::enable"]);
      logDebug("Heatmaps activées");
    } catch (error) {
      console.warn("[Matomo] Erreur heatmaps:", error);
    }
  };

  return {
    trackEvent,
    trackPageView,
    enableHeatmaps,
    isEnabled,
  };
}
