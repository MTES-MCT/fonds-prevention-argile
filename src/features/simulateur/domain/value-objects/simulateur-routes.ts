import type { PartnerKey } from "@/shared/domain/partners";

export const SIMULATEUR_EMBARQUE_URL = "/embed-simulateur";

// Seules les pages /embed-* s'affichent dans l'iframe d'un partenaire : /simulateur y est refusé (X-Frame-Options).
export function urlSimulateurEmbarque(partner: PartnerKey | null): string {
  return partner ? `${SIMULATEUR_EMBARQUE_URL}?partner=${encodeURIComponent(partner)}` : SIMULATEUR_EMBARQUE_URL;
}
