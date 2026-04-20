"use client";

import { create } from "zustand";

/**
 * Étapes du wizard de création de dossier par un AV.
 *
 * Le wizard reste à 3 étapes dans tous les cas : la simulation n'est pas
 * inline car le composant `SimulateurEdition` existant opère sur un dossier
 * déjà persisté. Après création, si `wantsSimulation=true`, on redirige
 * l'agent vers la page du prospect où il peut démarrer la simulation.
 */
export enum WizardStep {
  CHOIX_MODE = 1,
  COORDONNEES = 2,
  ENVOI_EMAIL = 3,
}

export interface DemandeurForm {
  nom: string;
  prenom: string;
  telephone: string;
  email: string;
  adresseBien: string;
}

interface CreationDossierState {
  currentStep: WizardStep;
  /**
   * Choix du mode ("faire simulation" vs "sans simulation") effectué à l'étape 1.
   * Détermine la redirection finale, pas le nombre d'étapes du wizard.
   */
  wantsSimulation: boolean | null;
  demandeur: DemandeurForm;
  sendEmail: boolean;

  setWantsSimulation: (value: boolean) => void;
  updateDemandeur: (patch: Partial<DemandeurForm>) => void;
  setSendEmail: (value: boolean) => void;
  goTo: (step: WizardStep) => void;
  next: () => void;
  previous: () => void;
  reset: () => void;
}

const INITIAL_DEMANDEUR: DemandeurForm = {
  nom: "",
  prenom: "",
  telephone: "",
  email: "",
  adresseBien: "",
};

export const useCreationDossierStore = create<CreationDossierState>((set, get) => ({
  currentStep: WizardStep.CHOIX_MODE,
  wantsSimulation: null,
  demandeur: { ...INITIAL_DEMANDEUR },
  sendEmail: true,

  setWantsSimulation: (value) => set({ wantsSimulation: value }),
  updateDemandeur: (patch) =>
    set((state) => ({
      demandeur: { ...state.demandeur, ...patch },
    })),
  setSendEmail: (value) => set({ sendEmail: value }),
  goTo: (step) => set({ currentStep: step }),

  next: () => {
    const { currentStep } = get();
    if (currentStep < WizardStep.ENVOI_EMAIL) {
      set({ currentStep: (currentStep + 1) as WizardStep });
    }
  },

  previous: () => {
    const { currentStep } = get();
    if (currentStep > WizardStep.CHOIX_MODE) {
      set({ currentStep: (currentStep - 1) as WizardStep });
    }
  },

  reset: () =>
    set({
      currentStep: WizardStep.CHOIX_MODE,
      wantsSimulation: null,
      demandeur: { ...INITIAL_DEMANDEUR },
      sendEmail: true,
    }),
}));

export const TOTAL_STEPS = 3;
