import type { PartnerKey } from "@/shared/domain/partners";

export const VULNERABILITE_RGA_URL = "/vulnerabilite-rga";
export const VULNERABILITE_RGA_EMBARQUEE_URL = "/embed-vulnerabilite-rga";

// Miroir d'urlSimulateurEmbarque : /vulnerabilite-rga est refusé dans l'iframe d'un partenaire (X-Frame-Options).
export function urlVulnerabiliteEmbarquee(partner: PartnerKey | null): string {
  return partner
    ? `${VULNERABILITE_RGA_EMBARQUEE_URL}?partner=${encodeURIComponent(partner)}`
    : VULNERABILITE_RGA_EMBARQUEE_URL;
}
