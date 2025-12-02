/**
 * Utilitaires asynchrones
 */

/**
 * Délai d'attente (rate limiting, animations, etc.)
 */
export async function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
