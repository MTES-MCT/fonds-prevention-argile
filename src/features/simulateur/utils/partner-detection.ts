/**
 * Détection du partenaire d'origine pour les simulations lancées depuis une iframe.
 *
 * Deux sources possibles, par ordre de priorité :
 *   1. paramètre URL `?partner=maif` (explicite, fiable)
 *   2. `document.referrer` (automatique, ~90% de couverture selon navigateurs/policies)
 *
 * La détection automatique permet de tracker les partenaires sans qu'ils aient
 * à modifier leur URL d'embed (utile en attendant qu'ils mettent à jour leur intégration).
 */

/**
 * Map host du referrer → slug partenaire utilisé en interne.
 * Doit rester en synchro avec PARTNER_REFERRERS dans le backoffice
 * (src/features/backoffice/administration/acquisition/domain/types/partner.types.ts).
 */
const PARTNER_REFERRER_HOSTS: Record<string, string> = {
  "auxalentours.maif.fr": "maif",
};

/**
 * Slugs partenaires connus côté client. Une URL `?partner=` avec une autre valeur est ignorée.
 */
const KNOWN_PARTNER_SLUGS = new Set(Object.values(PARTNER_REFERRER_HOSTS));

/**
 * Extrait le partenaire depuis un referrer (URL complète style `https://auxalentours.maif.fr/...`).
 * Retourne null si le referrer est vide, mal formé, ou ne matche aucun host connu.
 */
export function detectPartnerFromReferrer(referrer: string | null | undefined): string | null {
  if (!referrer) return null;
  try {
    const host = new URL(referrer).host.toLowerCase();
    return PARTNER_REFERRER_HOSTS[host] ?? null;
  } catch {
    return null;
  }
}

/**
 * Valide qu'un slug brut (depuis `?partner=...`) correspond à un partenaire connu.
 */
export function normalizePartnerSlug(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim().toLowerCase();
  return KNOWN_PARTNER_SLUGS.has(trimmed) ? trimmed : null;
}

/**
 * Résout le partenaire en combinant param URL (priorité) et referrer (fallback).
 * À appeler côté navigateur uniquement (utilise `document.referrer`).
 */
export function resolvePartner(urlParam: string | null | undefined, referrer: string | null | undefined): string | null {
  return normalizePartnerSlug(urlParam) ?? detectPartnerFromReferrer(referrer);
}
