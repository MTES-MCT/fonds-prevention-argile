import { getServerEnv } from "../config/env.config";

// Helper pour générer l'URL de la démarche dans Démarches Simplifiées
export function getDemarcheUrl(dsNumber: string): string {
  const env = getServerEnv();
  const baseDsUrl =
    env.DEMARCHES_SIMPLIFIEES_BASE_URL ||
    "https://www.demarches-simplifiees.fr";

  return `${baseDsUrl}/dossiers/${dsNumber}`;
}
