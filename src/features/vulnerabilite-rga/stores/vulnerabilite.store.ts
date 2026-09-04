import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { VulnerabiliteState } from "../domain/entities/vulnerabilite-state.entity";
import type { PartialVulnerabiliteReponses } from "../domain/types/vulnerabilite-reponses.types";
import { VulnerabiliteFlowService } from "../domain/services/vulnerabilite-flow.service";

const VULNERABILITE_STORAGE_KEY = "fonds-argile-vulnerabilite-rga";

interface VulnerabiliteStoreState {
  vulnerabilite: VulnerabiliteState;
  isHydrated: boolean;

  start: () => void;
  submitAnswer: (answers: PartialVulnerabiliteReponses) => void;
  goBack: () => void;
  reset: () => void;
  setHydrated: () => void;
}

/**
 * Store Zustand du simulateur de vulnérabilité RGA. Persisté en sessionStorage
 * (durée de la session uniquement) — même mécanique que `useSimulateurStore` du
 * simulateur d'éligibilité, en plus simple (pas de mode édition, pas d'early-exit).
 */
export const useVulnerabiliteStore = create<VulnerabiliteStoreState>()(
  persist(
    (set) => ({
      vulnerabilite: VulnerabiliteFlowService.create(),
      isHydrated: false,

      start: () => {
        set((state) => ({ vulnerabilite: VulnerabiliteFlowService.start(state.vulnerabilite) }));
      },

      submitAnswer: (answers: PartialVulnerabiliteReponses) => {
        set((state) => ({ vulnerabilite: VulnerabiliteFlowService.submitAnswer(state.vulnerabilite, answers) }));
      },

      goBack: () => {
        set((state) => ({ vulnerabilite: VulnerabiliteFlowService.goBack(state.vulnerabilite) }));
      },

      reset: () => {
        set({ vulnerabilite: VulnerabiliteFlowService.reset() });
      },

      setHydrated: () => {
        set({ isHydrated: true });
      },
    }),
    {
      name: VULNERABILITE_STORAGE_KEY,
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({ vulnerabilite: state.vulnerabilite }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated();
      },
    }
  )
);

export const selectVulnerabilite = (state: VulnerabiliteStoreState) => state.vulnerabilite;
export const selectCurrentStep = (state: VulnerabiliteStoreState) => state.vulnerabilite.currentStep;
export const selectAnswers = (state: VulnerabiliteStoreState) => state.vulnerabilite.answers;
export const selectResult = (state: VulnerabiliteStoreState) => state.vulnerabilite.result;
export const selectIsHydrated = (state: VulnerabiliteStoreState) => state.isHydrated;
export const selectCanGoBack = (state: VulnerabiliteStoreState) =>
  VulnerabiliteFlowService.canGoBack(state.vulnerabilite);
