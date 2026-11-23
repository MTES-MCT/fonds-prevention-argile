const ORIGINE_FICTIVE = "https://site.invalid";

// L'adresse de retour après connexion vient d'un cookie, qu'un autre sous-domaine peut poser : seul un
// chemin du site est accepté. Résolu comme le fera le navigateur (« //hôte », « /\hôte », tabulations).
export function estCheminInterne(valeur: string | null | undefined): valeur is string {
  if (!valeur || !valeur.startsWith("/")) return false;
  try {
    return new URL(valeur, ORIGINE_FICTIVE).origin === ORIGINE_FICTIVE;
  } catch {
    return false;
  }
}
