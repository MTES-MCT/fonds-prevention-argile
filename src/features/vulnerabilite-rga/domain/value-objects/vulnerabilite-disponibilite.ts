import { isProduction } from "@/shared/config/env.config";

/**
 * Le simulateur de vulnérabilité n'est pas déployé en production : sa grille de pondération
 * n'est pas validée par un expert RGA (ADR-0030). Il reste accessible en local, docker et
 * staging pour l'itération produit. Un seul point de bascule le jour de la mise en ligne.
 */
export function isVulnerabiliteRgaActive(): boolean {
  return !isProduction();
}
