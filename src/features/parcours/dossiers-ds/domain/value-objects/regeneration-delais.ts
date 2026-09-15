/** Fenêtre anti-rafale : évite qu'un double-clic n'empile les brouillons côté DN. */
export const DELAI_MIN_REGENERATION_MINUTES = 10;

/**
 * Plancher appliqué quand le demandeur a confirmé en modale : sa confirmation explicite
 * remplace la fenêtre de 10 min, qui refusait le cas nominal (ouvrir le lien, constater
 * qu'il ne marche pas, en redemander un). Il ne reste qu'un garde-fou anti double-clic.
 *
 * Vit dans le domaine et non dans le service : la modale l'utilise pour décompter côté
 * client, et importer le service embarquerait Drizzle dans le bundle.
 */
export const DELAI_MIN_REGENERATION_FORCE_SECONDES = 30;
