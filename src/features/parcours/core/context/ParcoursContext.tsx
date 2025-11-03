"use client";

import { createContext, useContext } from "react";

import type { Parcours, Status, Step } from "../domain";
import type { StatutValidationAmo } from "../../amo/domain/value-objects";
import type { ValidationAmoComplete } from "../../amo/domain/entities";
import type { DSStatus } from "../../dossiers-ds/domain/value-objects/ds-status";
import { DossierDS } from "../../dossiers-ds";

interface ParcoursContextType {
  // Données principales
  parcours: Parcours | null;
  dossiers: DossierDS[];

  // État actuel simplifié
  currentStep: Step | null;
  currentStatus: Status | null;

  // État AMO
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
  getDossierByStep: (step: Step) => DossierDS | undefined;
  getDSStatusByStep: (step: Step) => DSStatus | undefined;
  getCurrentDossier: () => DossierDS | undefined;
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
