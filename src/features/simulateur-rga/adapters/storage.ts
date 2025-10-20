import { RGAFormData } from "../types";
import { mergeDeep } from "@/lib/utils/object";

const RGA_SESSION_KEY = "fonds-argile-rga-data";

/**
 * Sauvegarde les données RGA en sessionStorage
 */
export function saveRGAToStorage(data: Partial<RGAFormData>): boolean {
  try {
    const serialized = JSON.stringify({
      data,
      timestamp: Date.now(),
      version: "1.0",
    });
    sessionStorage.setItem(RGA_SESSION_KEY, serialized);
    return true;
  } catch (error) {
    console.error("Erreur lors de la sauvegarde RGA:", error);
    return false;
  }
}

/**
 * Récupère les données RGA depuis sessionStorage
 */
export function getRGAFromStorage(): Partial<RGAFormData> | null {
  try {
    const stored = sessionStorage.getItem(RGA_SESSION_KEY);
    if (!stored) return null;

    const parsed = JSON.parse(stored);

    // Vérifier la structure
    if (!parsed.data || !parsed.timestamp) {
      console.warn("Structure RGA invalide en session");
      clearRGAFromStorage();
      return null;
    }

    // Vérifier l'âge (expiration après 24h)
    const age = Date.now() - parsed.timestamp;
    const maxAge = 24 * 60 * 60 * 1000; // 24 heures

    if (age > maxAge) {
      console.warn("Données RGA expirées en session");
      clearRGAFromStorage();
      return null;
    }

    return parsed.data;
  } catch (error) {
    console.error("Erreur lors de la lecture RGA:", error);
    clearRGAFromStorage();
    return null;
  }
}

/**
 * Nettoie les données RGA du sessionStorage
 */
export function clearRGAFromStorage(): void {
  try {
    sessionStorage.removeItem(RGA_SESSION_KEY);
  } catch (error) {
    console.error("Erreur lors du nettoyage RGA:", error);
  }
}

/**
 * Vérifie si des données RGA existent en session
 */
export function hasRGAInStorage(): boolean {
  try {
    return sessionStorage.getItem(RGA_SESSION_KEY) !== null;
  } catch (error) {
    console.error("Erreur lors de la vérification RGA:", error);
    return false;
  }
}

/**
 * Met à jour partiellement les données RGA
 */
export function updateRGAInStorage(updates: Partial<RGAFormData>): boolean {
  const existing = getRGAFromStorage();
  if (!existing) return false;

  // Merge profond des données
  const merged = mergeDeep(existing, updates);
  return saveRGAToStorage(merged);
}
