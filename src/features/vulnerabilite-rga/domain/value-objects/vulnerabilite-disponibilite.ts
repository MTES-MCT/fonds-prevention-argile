/** Environnements où le simulateur est servi. Volontairement une liste d'autorisation. */
const ENVIRONNEMENTS_ACTIFS = ["local", "docker", "staging"];

/**
 * Le simulateur de vulnérabilité n'est pas déployé en production : sa grille de catégorisation
 * n'est pas encore validée par un expert RGA (ADR-0030). Un seul point de bascule le jour de la mise
 * en ligne.
 *
 * Liste d'autorisation plutôt que refus de la production : le lecteur d'environnement partagé
 * applique un défaut "local" quand la variable est absente, ce qui rendrait le simulateur
 * visible sur une app mal configurée. Ici, variable absente ou valeur inconnue = inactif —
 * publier un résultat non validé à un ménage coûte plus cher qu'un 404 sur un poste de dev.
 */
export function isVulnerabiliteRgaActive(): boolean {
  // Interrupteur de désactivation seulement : il permet de voir le comportement de la production en
  // staging, sans changer NEXT_PUBLIC_APP_ENV (Matomo, e-mails et garde-fous des scripts en dépendent).
  // Il n'active jamais rien : « true » ou toute autre valeur laisse la liste d'autorisation décider.
  if (process.env.NEXT_PUBLIC_VULNERABILITE_RGA_ACTIVE === "false") return false;
  return ENVIRONNEMENTS_ACTIFS.includes(process.env.NEXT_PUBLIC_APP_ENV ?? "");
}
