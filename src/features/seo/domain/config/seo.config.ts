import { DEPARTEMENTS } from "@/shared/constants/departements.constants";

/**
 * Liste des codes départements éligibles au dispositif RGA
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
 * Nombre de communes à générer par département (triées par population décroissante)
 */
export const COMMUNES_PAR_DEPARTEMENT = 10;

/**
 * URLs des APIs publiques pour récupérer les données territoriales
 */
export const API_GEO = {
  baseUrl: "https://geo.api.gouv.fr",
  endpoints: {
    departements: "/departements",
    communes: "/departements/{code}/communes",
    epci: "/epcis",
    communesByEpci: "/epcis/{code}/communes",
  },
} as const;

/**
 * Récupère les informations d'un département éligible
 */
export function getDepartementEligible(code: string): {
  code: string;
  nom: string;
} | null {
  if (!DEPARTEMENTS_ELIGIBLES_RGA.includes(code as CodeDepartementEligible)) {
    return null;
  }

  const nom = DEPARTEMENTS[code];
  if (!nom) {
    return null;
  }

  return { code, nom };
}

/**
 * Vérifie si un département est éligible au dispositif RGA
 */
export function isDepartementEligible(code: string): boolean {
  return DEPARTEMENTS_ELIGIBLES_RGA.includes(code as CodeDepartementEligible);
}

/**
 * Récupère tous les départements éligibles avec leurs noms
 */
export function getAllDepartementsEligibles(): Array<{
  code: string;
  nom: string;
}> {
  return DEPARTEMENTS_ELIGIBLES_RGA.map((code) => ({
    code,
    nom: DEPARTEMENTS[code] || code,
  }));
}
