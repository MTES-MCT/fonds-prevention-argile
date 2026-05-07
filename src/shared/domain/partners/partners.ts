/**
 * Source de vérité unique pour les partenaires intégrant le simulateur via iframe.
 *
 * ┌──────────────────────────────────────────────────────────────────────┐
 * │ POUR AJOUTER UN PARTENAIRE : ajouter une entrée dans PARTNERS.        │
 * │ C'est tout — pas d'autre fichier à modifier.                          │
 * └──────────────────────────────────────────────────────────────────────┘
 *
 * Voir docs/partners/PARTNER-TRACKING.md pour le scénario complet.
 *
 * Module isomorphique : utilisable côté client (composants React) ET serveur
 * (Server Components, Server Actions, services BDD, route handlers).
 */

interface PartnerDefinition {
  /** Host complet du site partenaire transmis dans le `Referer` HTTP (ex: "auxalentours.maif.fr") */
  referrerHost: string;
  /** Libellé affiché dans le filtre du backoffice */
  label: string;
}

/**
 * Catalogue des partenaires connus.
 * La clé est le slug utilisé partout (URL `?partner=`, cookie, BDD, Matomo segment).
 *
 * Conventions :
 * - Slug en kebab-case, lowercase, sans accent (ex: "maif", "maisons-sans-fissures")
 * - Doit rester ≤ 50 caractères (contrainte BDD `users.partner_source`)
 */
export const PARTNERS = {
  maif: {
    referrerHost: "auxalentours.maif.fr",
    label: "MAIF (auxalentours)",
  },
  "maisons-sans-fissures": {
    referrerHost: "maisons-sans-fissures.vercel.app",
    label: "Maisons sans fissures (test)",
  },
} as const satisfies Record<string, PartnerDefinition>;

export type PartnerKey = keyof typeof PARTNERS;

// ---------------------------------------------------------------------------
// Helpers dérivés (calculés à partir de PARTNERS, ne pas modifier manuellement)
// ---------------------------------------------------------------------------

const PARTNER_KEYS = Object.keys(PARTNERS) as PartnerKey[];

/** Map slug → host (pour construire les segments Matomo `referrerName==<host>`) */
export const PARTNER_REFERRERS: Record<PartnerKey, string> = Object.fromEntries(
  PARTNER_KEYS.map((key) => [key, PARTNERS[key].referrerHost])
) as Record<PartnerKey, string>;

/** Map slug → label (pour l'UI du backoffice) */
export const PARTNER_LABELS: Record<PartnerKey, string> = Object.fromEntries(
  PARTNER_KEYS.map((key) => [key, PARTNERS[key].label])
) as Record<PartnerKey, string>;

/** Options pour les `<select>` (ordre de déclaration dans PARTNERS) */
export const PARTNER_OPTIONS: { value: PartnerKey; label: string }[] = PARTNER_KEYS.map((key) => ({
  value: key,
  label: PARTNERS[key].label,
}));

/** Map host → slug (pour la détection auto via `document.referrer`) */
const PARTNER_HOSTS_TO_KEY: Record<string, PartnerKey> = Object.fromEntries(
  PARTNER_KEYS.map((key) => [PARTNERS[key].referrerHost.toLowerCase(), key])
);

const KNOWN_SLUGS = new Set<string>(PARTNER_KEYS);

// ---------------------------------------------------------------------------
// Validation et résolution
// ---------------------------------------------------------------------------

/** Vérifie qu'un slug arbitraire correspond à un partenaire connu. */
export function isPartnerKey(value: string): value is PartnerKey {
  return KNOWN_SLUGS.has(value);
}

/**
 * Normalise un slug brut (ex: depuis `?partner=...`) :
 * - trim, lowercase
 * - rejette les slugs inconnus → `null`
 *
 * Sécurité : empêche d'écrire n'importe quoi dans `users.partner_source`.
 */
export function normalizePartnerSlug(value: string | null | undefined): PartnerKey | null {
  if (!value) return null;
  const trimmed = value.trim().toLowerCase();
  return isPartnerKey(trimmed) ? trimmed : null;
}

/**
 * Extrait le partenaire depuis un referrer (URL complète style `https://auxalentours.maif.fr/...`).
 * Retourne null si vide, mal formé, ou host inconnu.
 */
export function detectPartnerFromReferrer(referrer: string | null | undefined): PartnerKey | null {
  if (!referrer) return null;
  try {
    const host = new URL(referrer).host.toLowerCase();
    return PARTNER_HOSTS_TO_KEY[host] ?? null;
  } catch {
    return null;
  }
}

/**
 * Résout le partenaire en combinant param URL (priorité) et referrer (fallback).
 * À appeler côté navigateur uniquement (utilise `document.referrer`).
 */
export function resolvePartner(
  urlParam: string | null | undefined,
  referrer: string | null | undefined
): PartnerKey | null {
  return normalizePartnerSlug(urlParam) ?? detectPartnerFromReferrer(referrer);
}
