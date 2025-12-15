import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { PartialRGASimulationData } from "@/shared/domain/types";

const RGA_STORAGE_KEY = "fonds-argile-rga-data";
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 jours
const STORAGE_VERSION = "1.0";

/**
 * Format de stockage (compatible avec l'ancien système)
 */
interface StoredRGAData {
  data: PartialRGASimulationData;
  timestamp: number;
  version: string;
}

/**
 * État du store RGA
 */
interface RGAState {
  // Données
  tempRgaData: PartialRGASimulationData | null;

  // Hydratation (pour éviter le flash côté client)
  isHydrated: boolean;

  // Actions
  saveRGA: (data: PartialRGASimulationData) => void;
  clearRGA: () => void;
  setHydrated: () => void;
}

/**
 * Custom storage pour gérer l'expiration et le format
 */
const rgaStorage = {
  getItem: (name: string): string | null => {
    if (typeof window === "undefined") return null;

    try {
      const raw = localStorage.getItem(name);
      if (!raw) return null;

      const stored: StoredRGAData = JSON.parse(raw);

      // Vérifier expiration
      if (stored.timestamp && Date.now() - stored.timestamp > MAX_AGE_MS) {
        console.warn("[RGA Store] Données expirées, suppression");
        localStorage.removeItem(name);
        return null;
      }

      // Retourner au format Zustand (juste la data)
      return JSON.stringify({ state: { tempRgaData: stored.data }, version: 0 });
    } catch (error) {
      console.error("[RGA Store] Erreur lecture localStorage:", error);
      return null;
    }
  },

  setItem: (name: string, value: string): void => {
    if (typeof window === "undefined") return;

    try {
      const parsed = JSON.parse(value);
      const data = parsed.state?.tempRgaData;

      if (!data) {
        localStorage.removeItem(name);
        return;
      }

      // Sauvegarder au format compatible
      const stored: StoredRGAData = {
        data,
        timestamp: Date.now(),
        version: STORAGE_VERSION,
      };

      localStorage.setItem(name, JSON.stringify(stored));
    } catch (error) {
      console.error("[RGA Store] Erreur écriture localStorage:", error);
    }
  },

  removeItem: (name: string): void => {
    if (typeof window === "undefined") return;

    localStorage.removeItem(name);
  },
};

/**
 * Store Zustand pour les données RGA du simulateur
 * Utilisé UNIQUEMENT comme cache temporaire avant authentification
 */
export const useRGAStore = create<RGAState>()(
  persist(
    (set, get) => ({
      // État initial
      tempRgaData: null,
      isHydrated: false,

      // Actions
      saveRGA: (data: PartialRGASimulationData) => {
        set({ tempRgaData: data });
      },

      clearRGA: () => {
        set({ tempRgaData: null });
      },

      setHydrated: () => {
        set({ isHydrated: true });
      },
    }),
    {
      name: RGA_STORAGE_KEY,
      storage: createJSONStorage(() => rgaStorage),
      partialize: (state) => ({ tempRgaData: state.tempRgaData }),
      onRehydrateStorage: () => (state) => {
        // Appelé après l'hydratation
        if (state) {
          state.setHydrated();
        }
      },
    }
  )
);

/**
 * Sélecteurs pour éviter les re-renders inutiles
 */
export const selectTempRgaData = (state: RGAState) => state.tempRgaData;
export const selectIsHydrated = (state: RGAState) => state.isHydrated;
export const selectHasRGAData = (state: RGAState) => state.tempRgaData !== null;
