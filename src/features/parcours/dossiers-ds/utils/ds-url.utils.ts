import { getSharedEnv } from "@/shared/config/env.config";
import { DSStatus } from "../domain/value-objects/ds-status";

// Signal de bascule = `submitted_at` (date de dépôt = passage en construction côté DS),
// PAS `ds_status` : DS renvoie `en_construction` aussi bien pour un brouillon non déposé
// que pour un dossier déposé en attente d'instruction — seul `submitted_at` les distingue.
// Voir ADR-0012.
//
// - Brouillon NON déposé (`submitted_at` absent) → URL prefill `/commencer/...?prefill_token=...`
//   (force le mode "usager" sur les comptes DS multi-profils, et permet de reprendre/déposer).
// - Déposé (`submitted_at` renseigné, ou statut déjà en instruction/accepté/...) → URL stable
//   `/dossiers/<dsNumber>/demande` : le lien prefill `/commencer` ne pointe plus vers le dossier
//   une fois déposé (404).
export function buildDemarcheUrl(d: {
  dsStatus: DSStatus | string | null;
  dsNumber: string | null;
  dsUrl: string | null;
  submittedAt?: Date | null;
}): string | undefined {
  if (d.dsStatus === DSStatus.NON_ACCESSIBLE) return undefined;

  const stableUrl = d.dsNumber ? getDossierDsDemandeUrl(parseInt(d.dsNumber)) : undefined;

  const isDepose =
    !!d.submittedAt ||
    d.dsStatus === DSStatus.EN_INSTRUCTION ||
    d.dsStatus === DSStatus.ACCEPTE ||
    d.dsStatus === DSStatus.REFUSE ||
    d.dsStatus === DSStatus.CLASSE_SANS_SUITE;

  // Déposé → URL stable (le lien prefill est mort). Brouillon → URL prefill.
  if (isDepose) return stableUrl || d.dsUrl || undefined;
  return d.dsUrl || stableUrl;
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

// Helper pour générer l'URL back-office d'une démarche (page procédure)
export function getDemarcheProceduresUrl(demarcheNumber?: number | string | null | undefined): string {
  if (!demarcheNumber) {
    return "#";
  }
  const env = getSharedEnv();
  const baseDsUrl = env?.NEXT_PUBLIC_DEMARCHES_SIMPLIFIEES_BASE_URL || "https://www.demarches-simplifiees.fr";
  return `${baseDsUrl}/procedures/${demarcheNumber}`;
}
