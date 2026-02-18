import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { SimulationState } from "../domain/entities/simulation-state.entity";
import type { PartialRGASimulationData } from "@/shared/domain/types";
import { SimulationService } from "../domain/services/simulation.service";
import { SimulateurStep } from "../domain/value-objects/simulateur-step.enum";

const SIMULATEUR_STORAGE_KEY = "fonds-argile-simulateur";

/**
 * État du store simulateur
 */
interface SimulateurState {
  // État de la simulation
  simulation: SimulationState;

  // Mode édition (agent AMO/allers-vers) — désactive les early exits
  editMode: boolean;

  // Hydratation SSR
  isHydrated: boolean;

  // Actions
  start: () => void;
  submitAnswer: (answers: PartialRGASimulationData) => void;
  goBack: () => void;
  reset: () => void;
  setEditMode: (editMode: boolean) => void;
  setHydrated: () => void;
}

/**
 * Store Zustand pour le simulateur d'éligibilité
 * Persiste en sessionStorage (durée de la session uniquement)
 */
export const useSimulateurStore = create<SimulateurState>()(
  persist(
    (set, get) => ({
      // État initial
      simulation: SimulationService.create(),
      editMode: false,
      isHydrated: false,

      // Démarre la simulation (intro → première étape)
      start: () => {
        set((state) => ({
          simulation: SimulationService.start(state.simulation),
        }));
      },

      // Soumet une réponse et passe à l'étape suivante
      submitAnswer: (answers: PartialRGASimulationData) => {
        const { editMode } = get();
        set((state) => ({
          simulation: SimulationService.submitAnswer(state.simulation, answers, {
            skipEarlyExit: editMode,
          }),
        }));
      },

      // Revient à l'étape précédente
      goBack: () => {
        const { editMode } = get();
        set((state) => ({
          simulation: SimulationService.goBack(state.simulation, {
            preserveAnswers: editMode,
          }),
        }));
      },

      // Réinitialise la simulation
      reset: () => {
        set({ simulation: SimulationService.reset(), editMode: false });
      },

      // Active/désactive le mode édition
      setEditMode: (editMode: boolean) => {
        set({ editMode });
      },

      // Marque comme hydraté
      setHydrated: () => {
        set({ isHydrated: true });
      },
    }),
    {
      name: SIMULATEUR_STORAGE_KEY,
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({ simulation: state.simulation }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          const sim = state.simulation;
          if (sim.currentStep === "resultat" && sim.result && !sim.result.checks) {
            console.warn("[SimulateurStore] Réhydratation : result présent mais checks manquants", {
              currentStep: sim.currentStep,
              resultEligible: sim.result.eligible,
              resultKeys: Object.keys(sim.result),
            });
          }
          state.setHydrated();
        }
      },
    }
  )
);

/**
 * Sélecteurs pour éviter les re-renders inutiles
 */
export const selectSimulation = (state: SimulateurState) => state.simulation;
export const selectCurrentStep = (state: SimulateurState) => state.simulation.currentStep;
export const selectAnswers = (state: SimulateurState) => state.simulation.answers;
export const selectResult = (state: SimulateurState) => state.simulation.result;
export const selectHistory = (state: SimulateurState) => state.simulation.history;
export const selectIsHydrated = (state: SimulateurState) => state.isHydrated;

export const selectCanGoBack = (state: SimulateurState) => SimulationService.canGoBack(state.simulation);

export const selectIsFinished = (state: SimulateurState) => SimulationService.isFinished(state.simulation);

export const selectIsEligible = (state: SimulateurState) => SimulationService.isEligible(state.simulation);

export const selectIsIntro = (state: SimulateurState) => state.simulation.currentStep === SimulateurStep.INTRO;

export const selectIsResultat = (state: SimulateurState) => state.simulation.currentStep === SimulateurStep.RESULTAT;

export const selectEditMode = (state: SimulateurState) => state.editMode;
