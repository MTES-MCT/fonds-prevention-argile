import { getSharedEnv } from "@/shared/config/env.config";

// Helper pour générer l'URL de la demande dans Démarches Simplifiées
export function getDossierDsDemandeUrl(dsNumber?: number | null | undefined): string {
  if (!dsNumber) {
    return "#";
  }
  const env = getSharedEnv();
  const baseDsUrl = env?.NEXT_PUBLIC_DEMARCHES_SIMPLIFIEES_BASE_URL || "https://www.demarches-simplifiees.fr";
  return `${baseDsUrl}/dossiers/${dsNumber}/demande`;
}

// Helper pour générer l'URL de la messagerie du dossier dans Démarches Simplifiées
export function getDossierDsMessagerieUrl(dsNumber?: number | null | undefined): string {
  if (!dsNumber) {
    return "#";
  }
  const env = getSharedEnv();
  const baseDsUrl = env?.NEXT_PUBLIC_DEMARCHES_SIMPLIFIEES_BASE_URL || "https://www.demarches-simplifiees.fr";
  return `${baseDsUrl}/dossiers/${dsNumber}/messagerie`;
}
