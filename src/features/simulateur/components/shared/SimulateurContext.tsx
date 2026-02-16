"use client";

import { createContext, useContext, type ReactNode } from "react";

interface SimulateurContextValue {
  /** Titre principal du simulateur */
  formTitle?: string;
  /** Afficher le lien "Besoin d'aide ?" */
  showHelpLink?: boolean;
}

const SimulateurContext = createContext<SimulateurContextValue>({});

export function SimulateurProvider({
  children,
  ...value
}: SimulateurContextValue & { children: ReactNode }) {
  return <SimulateurContext.Provider value={value}>{children}</SimulateurContext.Provider>;
}

export function useSimulateurContext(): SimulateurContextValue {
  return useContext(SimulateurContext);
}
