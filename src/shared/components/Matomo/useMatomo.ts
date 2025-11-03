import { isProduction } from "@/shared/config/env.config";
import { MatomoEvent } from "@/shared/constants";
import { push } from "@socialgouv/matomo-next";

interface UseMatomo {
  trackEvent: (eventName: MatomoEvent, additionalData?: string) => void;
  trackPageView: (customUrl?: string) => void;
  enableHeatmaps: () => void;
  isEnabled: boolean;
}

export function useMatomo(): UseMatomo {
  const isEnabled = isProduction();

  const trackEvent = (eventName: MatomoEvent, additionalData?: string) => {
    if (!isEnabled) {
      console.log(
        `[Matomo Debug] Event: ${eventName}${additionalData ? ` - ${additionalData}` : ""}`
      );
      return;
    }

    try {
      push(["trackEvent", "User Action", eventName, additionalData]);
    } catch (error) {
      console.warn("Erreur Matomo tracking:", error);
    }
  };

  const trackPageView = (customUrl?: string) => {
    if (!isEnabled) {
      console.log(`[Matomo Debug] Page view: ${customUrl || "current page"}`);
      return;
    }

    try {
      if (customUrl) {
        push(["setCustomUrl", customUrl]);
      }
      push(["trackPageView"]);
    } catch (error) {
      console.warn("Erreur Matomo page view:", error);
    }
  };

  const enableHeatmaps = () => {
    if (!isEnabled) {
      console.log("[Matomo Debug] Heatmaps enabled");
      return;
    }

    try {
      push(["HeatmapSessionRecording::enable"]);
    } catch (error) {
      console.warn("Erreur Matomo heatmaps:", error);
    }
  };

  return {
    trackEvent,
    trackPageView,
    enableHeatmaps,
    isEnabled,
  };
}
