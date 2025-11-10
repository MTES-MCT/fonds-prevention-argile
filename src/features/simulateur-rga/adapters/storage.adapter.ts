import { mergeDeep } from "@/shared/utils/object.utils";
import {
  isInIframe,
  getPreferredStorage,
  isLocalStorageAvailable,
} from "@/shared/utils/browser.utils";
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
 * Adapter pour la gestion du storage RGA
 * - En iframe : utilise sessionStorage (moins de restrictions navigateur)
 * - Hors iframe : utilise localStorage (meilleure persistance)
 * - Gère la migration depuis sessionStorage (ancien système)
 */
export const storageAdapter = {
  /**
   * Sauvegarde les données RGA dans le storage approprié
   */
  save(data: PartialRGAFormData): boolean {
    try {
      const payload: StoredRGAData = {
        data,
        timestamp: Date.now(),
        version: "1.0",
      };

      const storage = getPreferredStorage();

      if (!storage) {
        console.error("[RGA Storage] Aucun storage disponible");
        return false;
      }

      storage.setItem(RGA_STORAGE_KEY, JSON.stringify(payload));

      const storageType =
        storage === sessionStorage ? "sessionStorage" : "localStorage";
      const context = isInIframe() ? "(iframe)" : "(normal)";
      console.log(`[RGA Storage] Sauvegarde en ${storageType} ${context}`);

      return true;
    } catch (error) {
      console.error("[RGA Storage] Erreur sauvegarde:", error);
      return false;
    }
  },

  /**
   * Récupère les données RGA
   * Ordre de priorité :
   * 1. Storage préféré (localStorage hors iframe, sessionStorage en iframe)
   * 2. Fallback sur l'autre storage
   * 3. sessionStorage ancien système (rétrocompatibilité)
   */
  get(): PartialRGAFormData | null {
    try {
      const preferredStorage = getPreferredStorage();

      if (!preferredStorage) {
        console.warn("[RGA Storage] Aucun storage disponible");
        return null;
      }

      // 1. Essayer le storage préféré
      const data = preferredStorage.getItem(RGA_STORAGE_KEY);

      if (data) {
        const parsed: StoredRGAData = JSON.parse(data);

        if (parsed.data && parsed.timestamp) {
          // Vérifier expiration UNIQUEMENT pour localStorage
          if (preferredStorage === localStorage) {
            const age = Date.now() - parsed.timestamp;

            if (age > MAX_AGE) {
              console.warn("[RGA Storage] Données localStorage expirées");
              localStorage.removeItem(RGA_STORAGE_KEY);
              // Continue vers les autres sources
            } else {
              return parsed.data;
            }
          } else {
            // sessionStorage : pas de vérification d'expiration
            return parsed.data;
          }
        }
      }

      // 2. Fallback : essayer l'autre storage
      const fallbackStorage =
        preferredStorage === localStorage ? sessionStorage : localStorage;

      if (fallbackStorage) {
        const fallbackData = fallbackStorage.getItem(RGA_STORAGE_KEY);

        if (fallbackData) {
          console.log(
            `[RGA Storage] Fallback vers ${fallbackStorage === localStorage ? "localStorage" : "sessionStorage"}`
          );
          const parsed: StoredRGAData = JSON.parse(fallbackData);

          if (parsed.data) {
            return parsed.data;
          }
        }
      }

      // 3. Rétrocompatibilité : sessionStorage ancien système
      const sessionData = this.getFromSessionStorage();
      if (sessionData) {
        console.log(
          "[RGA Storage] Données trouvées dans sessionStorage (ancien système)"
        );
        return sessionData;
      }

      return null;
    } catch (error) {
      console.error("[RGA Storage] Erreur lecture:", error);
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
      console.error("[RGA Storage] Erreur lecture sessionStorage:", error);
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
      return false;
    }
  },

  /**
   * Nettoie les données (tous les storages)
   */
  clear(): void {
    try {
      if (isLocalStorageAvailable()) {
        localStorage.removeItem(RGA_STORAGE_KEY);
      }
      sessionStorage.removeItem(RGA_SESSION_KEY);
      sessionStorage.removeItem(RGA_STORAGE_KEY);
    } catch (error) {
      console.error("[RGA Storage] Erreur nettoyage:", error);
    }
  },

  /**
   * Nettoie uniquement sessionStorage (ancien système)
   */
  clearSessionStorage(): void {
    try {
      sessionStorage.removeItem(RGA_SESSION_KEY);
      console.log("[RGA Storage] sessionStorage nettoyé");
    } catch (error) {
      console.error("[RGA Storage] Erreur nettoyage sessionStorage:", error);
    }
  },

  /**
   * Vérifie l'existence de données
   */
  exists(): boolean {
    try {
      const preferredStorage = getPreferredStorage();

      if (preferredStorage?.getItem(RGA_STORAGE_KEY)) {
        return true;
      }

      // Vérifier aussi l'autre storage et l'ancien système
      return (
        localStorage.getItem(RGA_STORAGE_KEY) !== null ||
        sessionStorage.getItem(RGA_STORAGE_KEY) !== null ||
        sessionStorage.getItem(RGA_SESSION_KEY) !== null
      );
    } catch (error) {
      console.error("[RGA Storage] Erreur vérification:", error);
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
