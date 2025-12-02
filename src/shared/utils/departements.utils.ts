/**
 * Utilitaires pour les départements français
 * Gestion des articles grammaticaux (du, de la, de l', des)
 */

import { DEPARTEMENTS } from "../constants/departements.constants";

/**
 * Articles grammaticaux par code département
 * Utilisé pour construire des phrases comme "RGA dans le département du Tarn"
 */
export const ARTICLES_DEPARTEMENTS: Record<string, string> = {
  "01": "de l'", // de l'Ain
  "02": "de l'", // de l'Aisne
  "03": "de l'", // de l'Allier
  "04": "des ", // des Alpes-de-Haute-Provence
  "05": "des ", // des Hautes-Alpes
  "06": "des ", // des Alpes-Maritimes
  "07": "de l'", // de l'Ardèche
  "08": "des ", // des Ardennes
  "09": "de l'", // de l'Ariège
  "10": "de l'", // de l'Aube
  "11": "de l'", // de l'Aude
  "12": "de l'", // de l'Aveyron
  "13": "des ", // des Bouches-du-Rhône
  "14": "du ", // du Calvados
  "15": "du ", // du Cantal
  "16": "de la ", // de la Charente
  "17": "de la ", // de la Charente-Maritime
  "18": "du ", // du Cher
  "19": "de la ", // de la Corrèze
  "21": "de la ", // de la Côte-d'Or
  "22": "des ", // des Côtes-d'Armor
  "23": "de la ", // de la Creuse
  "24": "de la ", // de la Dordogne
  "25": "du ", // du Doubs
  "26": "de la ", // de la Drôme
  "27": "de l'", // de l'Eure
  "28": "d'", // d'Eure-et-Loir
  "29": "du ", // du Finistère
  "30": "du ", // du Gard
  "31": "de la ", // de la Haute-Garonne
  "32": "du ", // du Gers
  "33": "de la ", // de la Gironde
  "34": "de l'", // de l'Hérault
  "35": "d'", // d'Ille-et-Vilaine
  "36": "de l'", // de l'Indre
  "37": "d'", // d'Indre-et-Loire
  "38": "de l'", // de l'Isère
  "39": "du ", // du Jura
  "40": "des ", // des Landes
  "41": "du ", // du Loir-et-Cher
  "42": "de la ", // de la Loire
  "43": "de la ", // de la Haute-Loire
  "44": "de la ", // de la Loire-Atlantique
  "45": "du ", // du Loiret
  "46": "du ", // du Lot
  "47": "du ", // du Lot-et-Garonne
  "48": "de la ", // de la Lozère
  "49": "du ", // du Maine-et-Loire
  "50": "de la ", // de la Manche
  "51": "de la ", // de la Marne
  "52": "de la ", // de la Haute-Marne
  "53": "de la ", // de la Mayenne
  "54": "de ", // de Meurthe-et-Moselle
  "55": "de la ", // de la Meuse
  "56": "du ", // du Morbihan
  "57": "de la ", // de la Moselle
  "58": "de la ", // de la Nièvre
  "59": "du ", // du Nord
  "60": "de l'", // de l'Oise
  "61": "de l'", // de l'Orne
  "62": "du ", // du Pas-de-Calais
  "63": "du ", // du Puy-de-Dôme
  "64": "des ", // des Pyrénées-Atlantiques
  "65": "des ", // des Hautes-Pyrénées
  "66": "des ", // des Pyrénées-Orientales
  "67": "du ", // du Bas-Rhin
  "68": "du ", // du Haut-Rhin
  "69": "du ", // du Rhône
  "70": "de la ", // de la Haute-Saône
  "71": "de ", // de Saône-et-Loire
  "72": "de la ", // de la Sarthe
  "73": "de la ", // de la Savoie
  "74": "de la ", // de la Haute-Savoie
  "75": "de ", // de Paris
  "76": "de la ", // de la Seine-Maritime
  "77": "de ", // de Seine-et-Marne
  "78": "des ", // des Yvelines
  "79": "des ", // des Deux-Sèvres
  "80": "de la ", // de la Somme
  "81": "du ", // du Tarn
  "82": "du ", // du Tarn-et-Garonne
  "83": "du ", // du Var
  "84": "du ", // du Vaucluse
  "85": "de la ", // de la Vendée
  "86": "de la ", // de la Vienne
  "87": "de la ", // de la Haute-Vienne
  "88": "des ", // des Vosges
  "89": "de l'", // de l'Yonne
  "90": "du ", // du Territoire de Belfort
  "91": "de l'", // de l'Essonne
  "92": "des ", // des Hauts-de-Seine
  "93": "de la ", // de la Seine-Saint-Denis
  "94": "du ", // du Val-de-Marne
  "95": "du ", // du Val-d'Oise
};

/**
 * Récupère l'article grammatical d'un département
 */
export function getArticleDepartement(code: string): string {
  return ARTICLES_DEPARTEMENTS[code] ?? "du ";
}

/**
 * Formate un département avec son article grammatical
 * @example formatDepartementAvecArticle("81", "Tarn") → "du Tarn"
 */
export function formatDepartementAvecArticle(code: string, nom: string): string {
  return `${getArticleDepartement(code)}${nom}`;
}

/**
 * Récupère le nom d'un département à partir de son code
 */
export function getDepartementNom(code: string): string | undefined {
  // Normaliser le code (supprimer le zéro initial si présent)
  const normalizedCode = /^0\d$/.test(code) ? code.replace(/^0/, "") : code;
  return DEPARTEMENTS[normalizedCode] ?? DEPARTEMENTS[code];
}
