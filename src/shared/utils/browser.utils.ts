/**
 * Détecte si le code s'exécute dans un iframe
 */
export function isInIframe(): boolean {
  try {
    return window.self !== window.top;
  } catch (e) {
    // Si on ne peut pas accéder à window.top (cross-origin), on est probablement dans une iframe
    return true;
  }
}

/**
 * Détecte si on est côté client (browser)
 */
export function isBrowser(): boolean {
  return typeof window !== "undefined";
}

/**
 * Détecte si le localStorage est disponible et accessible
 */
export function isLocalStorageAvailable(): boolean {
  if (!isBrowser()) return false;

  try {
    const testKey = "__localStorage_test__";
    localStorage.setItem(testKey, "test");
    localStorage.removeItem(testKey);
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Détecte si le sessionStorage est disponible et accessible
 */
export function isSessionStorageAvailable(): boolean {
  if (!isBrowser()) return false;

  try {
    const testKey = "__sessionStorage_test__";
    sessionStorage.setItem(testKey, "test");
    sessionStorage.removeItem(testKey);
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Retourne le storage le plus approprié selon le contexte
 */
export function getPreferredStorage(): Storage | null {
  if (!isBrowser()) return null;

  // Toujours privilégier localStorage (partagé entre onglets)
  if (isLocalStorageAvailable()) {
    return localStorage;
  }

  // Fallback sessionStorage
  if (isSessionStorageAvailable()) {
    return sessionStorage;
  }

  return null;
}
