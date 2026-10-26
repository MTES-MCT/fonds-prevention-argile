"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { AdresseChoisie } from "@/shared/adapters/ban";
import type { ActionResult } from "@/shared/types/action-result.types";

/** Test fait par un agent pour le compte d'un demandeur (au téléphone). */
export interface ContexteAgentVulnerabilite {
  nomDemandeur: string;
  /** Adresse du dossier : l'agent ne la ressaisit pas. */
  adresseInitiale: AdresseChoisie | null;
  /** Écrit le résultat sur le dossier ; remplace l'enregistrement anonyme du simulateur public. */
  enregistrer: (payload: unknown) => Promise<ActionResult<unknown>>;
  urlRetour: string;
}

interface VulnerabiliteContextValue {
  agent?: ContexteAgentVulnerabilite;
  /** Simulateur d'éligibilité vers lequel renvoie le résultat. Défaut : la page publique. */
  urlEligibilite?: string;
}

const VulnerabiliteContext = createContext<VulnerabiliteContextValue>({});

export function VulnerabiliteProvider({
  agent,
  urlEligibilite,
  children,
}: VulnerabiliteContextValue & { children: ReactNode }) {
  return <VulnerabiliteContext.Provider value={{ agent, urlEligibilite }}>{children}</VulnerabiliteContext.Provider>;
}

export function useVulnerabiliteContext(): VulnerabiliteContextValue {
  return useContext(VulnerabiliteContext);
}
