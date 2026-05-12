"use client";

import { create } from "zustand";
import type { BanAddressData } from "@/shared/adapters/ban";

/**
 * Intent du wizard : détermine le « chapeau » sous lequel l'agent crée le dossier.
 *
 * - `amo` (défaut) : entrée depuis `/espace-agent/dossiers` (rôles AMO ou
 *   AMO_ET_ALLERS_VERS). Le dossier est claim sur l'entreprise AMO de l'agent
 *   via `parcours_amo_validations`. Redirect post-création : `/dossiers`.
 * - `av` : entrée depuis `/espace-agent/prospects` (rôles ALLERS_VERS ou
 *   AMO_ET_ALLERS_VERS). Aucun claim AMO même si l'agent en a une. Redirect
 *   post-création : `/prospects`.
 */
export type WizardIntent = "amo" | "av";

/**
 * Étapes inline du wizard AV. Toujours 4 étapes affichées dans la ProgressBar.
 *
 * Mode "sans simulation" : choix → identité → contact (+ adresse) → envoi email
 * Mode "avec simulation" : choix → identité → contact → puis sortie du wizard
 * inline vers /simulation/[parcoursId] puis /resultat/[parcoursId]
 */
export enum WizardStep {
  CHOIX_MODE = 1,
  IDENTITE = 2,
  CONTACT = 3,
  ENVOI_EMAIL = 4,
}

export interface DemandeurForm {
  nom: string;
  prenom: string;
  telephone: string;
  email: string;
  /** Texte libre saisi par l'agent (label BAN ou saisie manuelle). */
  adresseBien: string;
  /**
   * Données structurées de l'adresse sélectionnée dans l'autocomplete BAN
   * (citycode, code département, EPCI, etc.). `null` tant que l'agent n'a pas
   * cliqué sur une suggestion, ou si le texte a été modifié depuis. Nécessaire
   * pour que le dossier match le territoire de l'AV dans `matchesTerritoire`.
   */
  adresseBienDetails: BanAddressData | null;
}

interface CreationDossierState {
  currentStep: WizardStep;
  wantsSimulation: boolean | null;
  demandeur: DemandeurForm;
  sendEmail: boolean;
  intent: WizardIntent;

  setWantsSimulation: (value: boolean) => void;
  updateDemandeur: (patch: Partial<DemandeurForm>) => void;
  setSendEmail: (value: boolean) => void;
  setIntent: (intent: WizardIntent) => void;
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
  adresseBienDetails: null,
};

export const useCreationDossierStore = create<CreationDossierState>((set, get) => ({
  currentStep: WizardStep.CHOIX_MODE,
  wantsSimulation: null,
  demandeur: { ...INITIAL_DEMANDEUR },
  sendEmail: true,
  intent: "amo",

  setWantsSimulation: (value) => set({ wantsSimulation: value }),
  updateDemandeur: (patch) =>
    set((state) => ({
      demandeur: { ...state.demandeur, ...patch },
    })),
  setSendEmail: (value) => set({ sendEmail: value }),
  setIntent: (intent) => set({ intent }),
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
      // Note : `intent` n'est PAS reset par défaut — il est posé une seule fois
      // au mount du wizard depuis le param URL. Reset uniquement si on quitte
      // complètement le flow de création (post-success redirect).
    }),
}));

/** Toujours 4 étapes affichées dans la ProgressBar (modes harmonisés). */
export const TOTAL_STEPS = 4;

/**
 * Numéro affiché dans le stepper selon le mode :
 * - Sans simulation : CHOIX = 1, IDENTITE = 2, CONTACT = 3, ENVOI_EMAIL = 4
 * - Avec simulation : CHOIX = 1, IDENTITE = 2, CONTACT = 2 (sub-step interne),
 *   SIMULATION = 3, RESULTAT = 4
 */
export function getDisplayedStepNumber(currentStep: WizardStep, wantsSimulation: boolean | null): number {
  if (wantsSimulation && currentStep === WizardStep.CONTACT) {
    return 2;
  }
  return currentStep;
}
