import type { PartialRGASimulationData } from "@/shared/domain/types";

type Logement = PartialRGASimulationData["logement"];

/**
 * En édition, peut-on reprendre l'adresse existante telle quelle — c'est-à-dire verrouiller
 * le champ et la carte, et rebâtir le bâtiment sélectionné depuis la simulation ?
 *
 * La vraie question est : **un bâtiment a-t-il déjà été sélectionné sur la carte ?** Un dossier
 * créé par un Aller-vers « sans simulation » porte l'adresse et ses coordonnées, mais n'a jamais
 * vu la carte : le verrouiller condamnait l'agent à un « Zone d'exposition forte : NON »
 * qu'aucune saisie ne pouvait corriger, la carte verrouillée n'interrogeant plus la BDNB.
 *
 * D'où les deux marqueurs d'une sélection réelle, dont **un seul suffit** :
 *  - une zone d'exposition renseignée ;
 *  - un identifiant RNB, que seule la sélection d'un bâtiment produit.
 *
 * Le second couvre le cas « hors zone argileuse », où la zone vaut légitimement `null` : on ne
 * peut pas se fier à la seule présence de la clé, l'appelant construisant un littéral dont
 * toutes les clés existent, y compris à `undefined`.
 */
export function peutReprendreAdresseExistante(logement: Logement | undefined): boolean {
  if (!logement?.coordonnees) return false;
  return logement.zone_dexposition != null || Boolean(logement.rnb);
}
