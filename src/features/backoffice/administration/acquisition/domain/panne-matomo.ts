/** Trace une panne Matomo et renvoie null, pour la distinguer d'un vrai zéro côté UI. */
export async function logMatomoFailure<T>(promise: Promise<T>, contexte: string): Promise<T | null> {
  try {
    return await promise;
  } catch (error) {
    console.error(`[matomo] echec ${contexte}:`, error instanceof Error ? error.message : error);
    return null;
  }
}
