"use client";

import { createContext, useContext, ReactNode, useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import type { AmoTabId } from "../domain/types/amo-tab.types";
import { AMO_TABS, DEFAULT_AMO_TAB } from "../domain/value-objects/amo-tabs.config";

interface AmoContextValue {
  activeTab: AmoTabId;
}

const AmoContext = createContext<AmoContextValue | undefined>(undefined);

/**
 * Provider pour l'espace AMO
 * Gère l'onglet actif selon la route courante
 */
export function AmoProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [activeTab, setActiveTab] = useState<AmoTabId>(DEFAULT_AMO_TAB);

  // Détermine l'onglet actif selon la route
  useEffect(() => {
    const matchedTab = AMO_TABS.find((tab) => {
      // Correspondance exacte ou sous-route (sauf pour la racine)
      if (tab.href === "/espace-agent") {
        return pathname === "/espace-agent" || pathname.startsWith("/espace-agent/validation");
      }
      return pathname.startsWith(tab.href);
    });

    if (matchedTab) {
      setActiveTab(matchedTab.id);
    }
  }, [pathname]);

  return <AmoContext.Provider value={{ activeTab }}>{children}</AmoContext.Provider>;
}

/**
 * Hook pour accéder au contexte AMO
 */
export function useAmoTab() {
  const context = useContext(AmoContext);
  if (!context) {
    throw new Error("useAmoTab must be used within AmoProvider");
  }
  return context;
}
