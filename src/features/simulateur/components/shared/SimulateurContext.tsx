"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { RGASimulationData } from "@/shared/domain/types/rga-simulation.types";

interface SimulateurContextValue {
  /** Titre principal du simulateur */
  formTitle?: string;
  /** Afficher le lien "Besoin d'aide ?" */
  showHelpLink?: boolean;
  /** Données initiales du demandeur (mode édition, pour comparaison) */
  initialData?: RGASimulationData | null;
  /** ID du dossier ou parcours (mode édition, pour la sauvegarde) */
  dossierId?: string;
  /** URL de redirection après sauvegarde (mode édition) */
  redirectAfterSave?: string;
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
