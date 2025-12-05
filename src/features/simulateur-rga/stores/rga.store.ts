import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { PartialRGAFormData } from "../domain/entities";

const RGA_STORAGE_KEY = "fonds-argile-rga-data";
const RGA_SESSION_KEY = "fonds-argile-rga-data"; // Ancien système
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 jours
const STORAGE_VERSION = "1.0";

/**
 * Format de stockage (compatible avec l'ancien système)
 */
interface StoredRGAData {
  data: PartialRGAFormData;
  timestamp: number;
  version: string;
}

/**
 * État du store RGA
 */
interface RGAState {
  // Données
  tempRgaData: PartialRGAFormData | null;

  // Hydratation (pour éviter le flash côté client)
  isHydrated: boolean;

  // Actions
  saveRGA: (data: PartialRGAFormData) => void;
  clearRGA: () => void;
  setHydrated: () => void;

  // Migration ancien système
  migrateFromSessionStorage: () => boolean;
  clearSessionStorage: () => void;
  hasSessionStorageData: () => boolean;
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
      saveRGA: (data: PartialRGAFormData) => {
        set({ tempRgaData: data });
      },

      clearRGA: () => {
        set({ tempRgaData: null });
        // Nettoyer aussi sessionStorage (ancien système)
        get().clearSessionStorage();
      },

      setHydrated: () => {
        set({ isHydrated: true });
      },

      // Migration depuis sessionStorage (ancien système)
      migrateFromSessionStorage: (): boolean => {
        try {
          const raw = sessionStorage.getItem(RGA_SESSION_KEY);
          if (!raw) return false;

          const stored: StoredRGAData = JSON.parse(raw);
          if (!stored.data) return false;

          // Migrer vers le store (et donc localStorage via persist)
          set({ tempRgaData: stored.data });

          return true;
        } catch (error) {
          console.error("[RGA Store] Erreur migration sessionStorage:", error);
          return false;
        }
      },

      clearSessionStorage: () => {
        try {
          sessionStorage.removeItem(RGA_SESSION_KEY);
        } catch (error) {
          console.error("[RGA Store] Erreur nettoyage sessionStorage:", error);
        }
      },

      hasSessionStorageData: (): boolean => {
        try {
          return sessionStorage.getItem(RGA_SESSION_KEY) !== null;
        } catch {
          return false;
        }
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

          // Si pas de données en localStorage, tenter migration sessionStorage
          if (!state.tempRgaData && state.hasSessionStorageData()) {
            state.migrateFromSessionStorage();
          }
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
