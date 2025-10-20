import type { PartialRGAFormData } from "../domain/entities/RGAFormData";
import { mergeDeep } from "@/shared/utils/object";

const RGA_SESSION_KEY = "fonds-argile-rga-data";
const MAX_AGE = 24 * 60 * 60 * 1000; // 24 heures

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
      sessionStorage.setItem(RGA_SESSION_KEY, JSON.stringify(payload));
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
      const stored = sessionStorage.getItem(RGA_SESSION_KEY);
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
      sessionStorage.removeItem(RGA_SESSION_KEY);
    } catch (error) {
      console.error("Erreur nettoyage RGA:", error);
    }
  },

  /**
   * Vérifie l'existence de données
   */
  exists(): boolean {
    try {
      return sessionStorage.getItem(RGA_SESSION_KEY) !== null;
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
