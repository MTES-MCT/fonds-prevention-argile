/**
 * Constantes liées au dispositif RGA (Retrait-Gonflement des Argiles)
 */

import { DEPARTEMENTS } from "./departements.constants";

/**
 * Codes des 11 départements éligibles au dispositif RGA
 */
export const DEPARTEMENTS_ELIGIBLES_RGA = [
  "03", // Allier
  "04", // Alpes-de-Haute-Provence
  "24", // Dordogne
  "32", // Gers
  "36", // Indre
  "47", // Lot-et-Garonne
  "54", // Meurthe-et-Moselle
  "59", // Nord
  "63", // Puy-de-Dôme
  "81", // Tarn
  "82", // Tarn-et-Garonne
] as const;

export type CodeDepartementEligible = (typeof DEPARTEMENTS_ELIGIBLES_RGA)[number];

/**
 * Vérifie si un département est éligible au dispositif RGA
 */
export function isDepartementEligible(code: string): boolean {
  return DEPARTEMENTS_ELIGIBLES_RGA.includes(code as CodeDepartementEligible);
}

/**
 * Récupère les informations d'un département éligible
 */
export function getDepartementEligible(code: string): { code: string; nom: string } | null {
  if (!isDepartementEligible(code)) {
    return null;
  }

  const nom = DEPARTEMENTS[code];
  return nom ? { code, nom } : null;
}

/**
 * Récupère tous les départements éligibles avec leurs noms
 */
export function getAllDepartementsEligibles(): Array<{ code: string; nom: string }> {
  return DEPARTEMENTS_ELIGIBLES_RGA.map((code) => ({
    code,
    nom: DEPARTEMENTS[code] ?? code,
  }));
}
