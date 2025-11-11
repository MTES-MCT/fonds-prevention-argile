import { mergeDeep } from "@/shared/utils/object.utils";
import { PartialRGAFormData } from "../domain/entities";

const RGA_STORAGE_KEY = "fonds-argile-rga-data";
const RGA_SESSION_KEY = "fonds-argile-rga-data"; // Ancien système
const MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 jours (localStorage uniquement)

interface StoredRGAData {
  data: PartialRGAFormData;
  timestamp: number;
  version: string;
}

/**
 * Adapter pour la gestion du localStorage RGA
 * Gère la migration depuis sessionStorage (ancien système)
 */
export const storageAdapter = {
  /**
   * Sauvegarde les données RGA
   */
  save(data: PartialRGAFormData): boolean {
    try {
      const payload: StoredRGAData = {
        data,
        timestamp: Date.now(),
        version: "1.0",
      };
      localStorage.setItem(RGA_STORAGE_KEY, JSON.stringify(payload));
      return true;
    } catch (error) {
      console.error("Erreur sauvegarde RGA:", error);
      return false;
    }
  },

  /**
   * Récupère les données RGA
   * Essaie localStorage en priorité, puis sessionStorage (fallback ancien système)
   */
  get(): PartialRGAFormData | null {
    try {
      // Priorité 1 : localStorage (nouveau système avec validation MAX_AGE)
      const localData = localStorage.getItem(RGA_STORAGE_KEY);

      if (localData) {
        const parsed: StoredRGAData = JSON.parse(localData);

        if (parsed.data && parsed.timestamp) {
          const age = Date.now() - parsed.timestamp;

          // Vérifier expiration pour localStorage
          if (age > MAX_AGE) {
            console.warn("Données localStorage RGA expirées");
            localStorage.removeItem(RGA_STORAGE_KEY);
            // Continue vers sessionStorage fallback
          } else {
            return parsed.data;
          }
        }
      }

      // Priorité 2 : sessionStorage (ancien système SANS validation MAX_AGE)
      const sessionData = sessionStorage.getItem(RGA_SESSION_KEY);

      if (sessionData) {
        const parsed: StoredRGAData = JSON.parse(sessionData);

        if (parsed.data) {
          return parsed.data;
        }
      }

      return null;
    } catch (error) {
      console.error("Erreur lecture RGA:", error);
      return null;
    }
  },

  /**
   * Récupère les données depuis sessionStorage uniquement (ancien système)
   * SANS validation MAX_AGE
   */
  getFromSessionStorage(): PartialRGAFormData | null {
    try {
      const stored = sessionStorage.getItem(RGA_SESSION_KEY);
      if (!stored) return null;

      const parsed: StoredRGAData = JSON.parse(stored);

      if (parsed.data) {
        return parsed.data;
      }

      return null;
    } catch (error) {
      console.error("Erreur lecture sessionStorage RGA:", error);
      return null;
    }
  },

  /**
   * Vérifie si des données existent dans sessionStorage (ancien système)
   */
  hasSessionStorageData(): boolean {
    try {
      return sessionStorage.getItem(RGA_SESSION_KEY) !== null;
    } catch (error) {
      console.error("Erreur vérification sessionStorage RGA:", error);
      return false;
    }
  },

  /**
   * Nettoie les données (localStorage ET sessionStorage)
   */
  clear(): void {
    try {
      localStorage.removeItem(RGA_STORAGE_KEY);
      sessionStorage.removeItem(RGA_SESSION_KEY);
    } catch (error) {
      console.error("Erreur nettoyage RGA:", error);
    }
  },

  /**
   * Nettoie uniquement sessionStorage (ancien système)
   */
  clearSessionStorage(): void {
    try {
      sessionStorage.removeItem(RGA_SESSION_KEY);
    } catch (error) {
      console.error("Erreur nettoyage sessionStorage RGA:", error);
    }
  },

  /**
   * Vérifie l'existence de données
   */
  exists(): boolean {
    try {
      return (
        localStorage.getItem(RGA_STORAGE_KEY) !== null ||
        sessionStorage.getItem(RGA_SESSION_KEY) !== null
      );
    } catch (error) {
      console.error("Erreur vérification RGA:", error);
      return false;
    }
  },

  /**
   * Met à jour partiellement
   */
  update(updates: PartialRGAFormData): boolean {
    const existing = this.get();
    if (!existing) return false;

    const merged = mergeDeep(existing, updates);
    return this.save(merged);
  },
};
