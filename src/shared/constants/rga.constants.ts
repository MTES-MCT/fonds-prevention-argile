/**
 * Constantes liées au dispositif RGA (Retrait-Gonflement des Argiles)
 */

import { DEPARTEMENTS, toOfficialCodeDepartement } from "./departements.constants";

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

/**
 * Ordre des listes de départements : ceux du fonds d'abord, dans l'ordre de `DEPARTEMENTS_ELIGIBLES_RGA`,
 * puis les autres par code. Accepte les codes avec ou sans zéro de tête (« 3 » comme « 03 »).
 */
export function comparerDepartementsFondsEnTete(a: string, b: string): number {
  const codeA = toOfficialCodeDepartement(a);
  const codeB = toOfficialCodeDepartement(b);
  const rangA = DEPARTEMENTS_ELIGIBLES_RGA.indexOf(codeA as CodeDepartementEligible);
  const rangB = DEPARTEMENTS_ELIGIBLES_RGA.indexOf(codeB as CodeDepartementEligible);

  if (rangA !== -1 || rangB !== -1) {
    if (rangA === -1) return 1;
    if (rangB === -1) return -1;
    return rangA - rangB;
  }
  // Codes officiels comparés en chaîne : « 2A » et « 2B » tombent après 29, l'outre-mer après 95.
  return codeA < codeB ? -1 : codeA > codeB ? 1 : 0;
}
