import { mergeDeep } from "@/shared/utils/object.utils";
import { PartialRGAFormData } from "../domain/entities";

const RGA_STORAGE_KEY = "fonds-argile-rga-data";
const MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 jours

interface StoredRGAData {
  data: PartialRGAFormData;
  timestamp: number;
  version: string;
}

/**
 * Adapter pour la gestion du sessionStorage
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
        version: "1.0", // Todo : gérer les versions si besoin
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
   */
  get(): PartialRGAFormData | null {
    try {
      const stored = localStorage.getItem(RGA_STORAGE_KEY);
      if (!stored) return null;

      const parsed: StoredRGAData = JSON.parse(stored);

      if (!parsed.data || !parsed.timestamp) {
        console.warn("Structure RGA invalide");
        this.clear();
        return null;
      }

      const age = Date.now() - parsed.timestamp;
      if (age > MAX_AGE) {
        console.warn("Données RGA expirées");
        this.clear();
        return null;
      }

      return parsed.data;
    } catch (error) {
      console.error("Erreur lecture RGA:", error);
      this.clear();
      return null;
    }
  },

  /**
   * Nettoie les données
   */
  clear(): void {
    try {
      localStorage.removeItem(RGA_STORAGE_KEY);
    } catch (error) {
      console.error("Erreur nettoyage RGA:", error);
    }
  },

  /**
   * Vérifie l'existence de données
   */
  exists(): boolean {
    try {
      return localStorage.getItem(RGA_STORAGE_KEY) !== null;
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
