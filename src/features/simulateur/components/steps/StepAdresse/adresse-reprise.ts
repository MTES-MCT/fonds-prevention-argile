import type { PartialRGASimulationData } from "@/shared/domain/types";

type Logement = PartialRGASimulationData["logement"];

/**
 * En édition, peut-on reprendre l'adresse existante telle quelle — c'est-à-dire verrouiller
 * le champ et la carte, et rebâtir le bâtiment sélectionné depuis la simulation ?
 *
 * Il y faut les coordonnées **et** une zone d'exposition déjà renseignée. Un dossier créé par
 * un Aller-vers « sans simulation » porte l'adresse et ses coordonnées, mais aucune zone : la
 * verrouiller condamnait l'agent à un « Zone d'exposition forte : NON » qu'aucune saisie ne
 * pouvait corriger, puisque la carte verrouillée n'interroge plus la BDNB.
 *
 * On teste la **présence de la clé**, pas sa valeur : `null` est une réponse à part entière
 * (« hors zone argileuse »), à distinguer de « jamais renseignée ».
 */
export function peutReprendreAdresseExistante(logement: Logement | undefined): boolean {
  if (!logement || !logement.coordonnees) return false;
  return "zone_dexposition" in logement;
}
