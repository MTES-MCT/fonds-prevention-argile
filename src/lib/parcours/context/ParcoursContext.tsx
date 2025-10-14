"use client";

import { createContext, useContext } from "react";
import {
  ParcoursPrevention,
  DossierDemarchesSimplifiees,
} from "@/lib/database/schema";
import { Step, Status, DSStatus } from "@/lib/parcours/parcours.types";
import { StatutValidationAmo, ValidationAmoComplete } from "../amo/amo.types";

interface ParcoursContextType {
  // Données principales
  parcours: ParcoursPrevention | null;
  dossiers: DossierDemarchesSimplifiees[];

  // État actuel simplifié
  currentStep: Step | null;
  currentStatus: Status | null;

  // Etat AMO
  statutAmo: StatutValidationAmo | null;
  validationAmoComplete: ValidationAmoComplete | null;

  // État de synchronisation DS
  lastDSStatus: DSStatus | null;
  isSyncing: boolean;
  lastSync: Date | null;

  // État de chargement
  isLoading: boolean;
  error: string | null;

  // Données calculées
  isComplete: boolean;
  prochainEtape: Step | null;
  hasParcours: boolean;

  // Actions
  refresh: () => Promise<void>;
  syncNow: (step?: Step) => Promise<void>;
  syncAll: () => Promise<void>;

  // Helpers
  getDossierByStep: (step: Step) => DossierDemarchesSimplifiees | undefined;
  getDSStatusByStep: (step: Step) => DSStatus | undefined;
  getCurrentDossier: () => DossierDemarchesSimplifiees | undefined;
}

const ParcoursContext = createContext<ParcoursContextType | undefined>(
  undefined
);

export function useParcoursContext() {
  const context = useContext(ParcoursContext);
  if (!context) {
    throw new Error("useParcoursContext must be used within ParcoursProvider");
  }
  return context;
}

export { ParcoursContext };
