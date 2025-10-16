"use client";

import { Suspense, useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { init, push } from "@socialgouv/matomo-next";
import { getClientEnv, isProduction, isStaging } from "@/lib/config/env.config";
import { useMatomo } from "@/hooks/useMatomo";

const MatomoContent = () => {
  const [initialised, setInitialised] = useState<boolean>(false);
  const { enableHeatmaps } = useMatomo();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchParamsString = searchParams.toString();

  // Initialisation de Matomo quand les variables d'environnement sont disponibles
  useEffect(() => {
    const clientEnv = getClientEnv();

    // Ne pas initialiser Matomo en dehors de la production
    if (!isProduction()) return;

    if (
      clientEnv.NEXT_PUBLIC_MATOMO_URL &&
      clientEnv.NEXT_PUBLIC_MATOMO_SITE_ID &&
      !initialised
    ) {
      init({
        siteId: clientEnv.NEXT_PUBLIC_MATOMO_SITE_ID,
        url: clientEnv.NEXT_PUBLIC_MATOMO_URL,
      });

      console.log("[Matomo] Initialisé avec succès !");
      setInitialised(true);
    }
  }, [initialised]);

  // Activation des heatmaps quand Matomo est initialisé
  useEffect(() => {
    if (initialised) {
      enableHeatmaps();
    }
  }, [initialised, enableHeatmaps]);

  // Suivi des changements de page
  useEffect(() => {
    if (!isProduction()) return;
    if (!pathname) return;

    const url = decodeURIComponent(
      pathname + (searchParamsString ? "?" + searchParamsString : "")
    );

    push(["setCustomUrl", url]);
    push(["trackPageView"]);
  }, [pathname, searchParamsString]);

  if (!isProduction()) return null;

  return null;
};

// MatomoContent is wrapped in Suspense because useSearchParams() may suspend while
// the route segment is loading on the server. This prevents client-side rendering bailout.
export default function Matomo() {
  return (
    <Suspense fallback={null}>
      <MatomoContent />
    </Suspense>
  );
}
