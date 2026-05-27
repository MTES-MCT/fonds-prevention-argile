import { getSharedEnv } from "@/shared/config/env.config";
import { DSStatus } from "../domain/value-objects/ds-status";

// En construction : on garde l'URL prefill DS (`/commencer/...?prefill_token=...`) qui
// force le mode "usager" sur les comptes DS multi-profils et permet de reprendre le brouillon.
// Une fois soumis (EN_INSTRUCTION, ACCEPTE, REFUSE, CLASSE_SANS_SUITE), on utilise l'URL stable
// `/dossiers/<dsNumber>/demande` : le prefill_token n'a plus de sens et son URL `/commencer`
// ne pointe plus vers le dossier instruit.
export function buildDemarcheUrl(d: {
  dsStatus: DSStatus | string | null;
  dsNumber: string | null;
  dsUrl: string | null;
}): string | undefined {
  if (d.dsStatus === DSStatus.NON_ACCESSIBLE) return undefined;

  const stableUrl = d.dsNumber ? getDossierDsDemandeUrl(parseInt(d.dsNumber)) : undefined;

  if (d.dsStatus === DSStatus.EN_CONSTRUCTION) {
    return d.dsUrl || stableUrl;
  }
  return stableUrl || d.dsUrl || undefined;
}

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

// Helper pour générer l'URL instructeur (back-office DS) d'un dossier
export function getDossierDsInstructeurUrl(
  dsDemarcheId?: string | null | undefined,
  dsNumber?: number | string | null | undefined
): string {
  if (!dsDemarcheId || !dsNumber) {
    return "#";
  }
  const env = getSharedEnv();
  const baseDsUrl = env?.NEXT_PUBLIC_DEMARCHES_SIMPLIFIEES_BASE_URL || "https://www.demarches-simplifiees.fr";
  return `${baseDsUrl}/procedures/${dsDemarcheId}/dossiers/${dsNumber}`;
}
