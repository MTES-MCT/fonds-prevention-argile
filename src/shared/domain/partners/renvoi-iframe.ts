import { normalizePartnerSlug } from "./partners";

export const EMBED_SIMULATEUR_URL = "/embed-simulateur";
export const EMBED_VULNERABILITE_RGA_URL = "/embed-vulnerabilite-rga";

/** Renvoi d'un simulateur à l'autre sans quitter l'iframe : hors `/embed-*`, la page refuse d'y être affichée. */
export function urlRenvoiIframe(chemin: string, partner: string | null | undefined): string {
  // Le referrer survit à la navigation client, mais un `?partner=` explicite doit suivre l'usager.
  const slug = normalizePartnerSlug(partner);
  return slug ? `${chemin}?partner=${encodeURIComponent(slug)}` : chemin;
}

/** `?vulnerabilite=0` : l'intégrateur ne veut pas qu'on propose le simulateur de vulnérabilité. */
export function vulnerabiliteRefuseeParIntegrateur(param: string | null | undefined): boolean {
  return param === "0";
}
