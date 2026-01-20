"use client";

import { ReactNode } from "react";
import { AmoProvider } from "@/features/backoffice/espace-amo";
import { AmoHeader, AmoNavigation } from "./components";

interface EspaceAmoLayoutProps {
  children: ReactNode;
}

/**
 * Layout pour l'espace AMO
 */
export default function EspaceAmoLayout({ children }: EspaceAmoLayoutProps) {
  return (
    <AmoProvider>
      <AmoHeader />
      <div className="fr-container">
        <AmoNavigation />
        <div className="fr-tabs__panel fr-tabs__panel--selected fr-py-4w">{children}</div>
      </div>
    </AmoProvider>
  );
}
