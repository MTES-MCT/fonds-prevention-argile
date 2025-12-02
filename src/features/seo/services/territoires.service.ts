import type { DepartementSEO, CommuneSEO, EpciSEO } from "@/features/seo";

import departementsData from "../data/generated/departements.json";
import communesData from "../data/generated/communes.json";
import epciData from "../data/generated/epci.json";

/**
 * Données typées depuis les JSON générés
 */
const departements = departementsData as DepartementSEO[];
const communes = communesData as CommuneSEO[];
const epcis = epciData as EpciSEO[];

/**
 * Récupère tous les départements
 */
export function getAllDepartements(): DepartementSEO[] {
  return departements;
}

/**
 * Récupère un département par son slug
 */
export function getDepartementBySlug(slug: string): DepartementSEO | undefined {
  return departements.find((d) => d.slug === slug);
}

/**
 * Récupère un département par son code
 */
export function getDepartementByCode(code: string): DepartementSEO | undefined {
  return departements.find((d) => d.code === code);
}

/**
 * Récupère toutes les communes
 */
export function getAllCommunes(): CommuneSEO[] {
  return communes;
}

/**
 * Récupère une commune par son slug
 */
export function getCommuneBySlug(slug: string): CommuneSEO | undefined {
  return communes.find((c) => c.slug === slug);
}

/**
 * Récupère les communes d'un département
 */
export function getCommunesByDepartement(codeDepartement: string): CommuneSEO[] {
  return communes.filter((c) => c.codeDepartement === codeDepartement).sort((a, b) => b.population - a.population);
}

/**
 * Récupère les X communes les plus peuplées d'un département
 */
export function getTopCommunesByDepartement(codeDepartement: string, limit: number = 8): CommuneSEO[] {
  return getCommunesByDepartement(codeDepartement).slice(0, limit);
}

/**
 * Récupère les communes suivantes après une commune donnée (par population)
 * Pour la section "En savoir plus" des pages communes
 */
export function getNextCommunesByPopulation(commune: CommuneSEO, limit: number = 8): CommuneSEO[] {
  const communesDuDepartement = getCommunesByDepartement(commune.codeDepartement);

  // Trouver l'index de la commune actuelle
  const currentIndex = communesDuDepartement.findIndex((c) => c.codeInsee === commune.codeInsee);

  if (currentIndex === -1) {
    return communesDuDepartement.slice(0, limit);
  }

  // Prendre les communes suivantes (moins peuplées)
  const nextCommunes = communesDuDepartement.slice(currentIndex + 1, currentIndex + 1 + limit);

  // Si pas assez, compléter avec les communes précédentes (plus peuplées)
  if (nextCommunes.length < limit) {
    const remaining = limit - nextCommunes.length;
    const previousCommunes = communesDuDepartement.slice(0, currentIndex).slice(-remaining);
    return [...nextCommunes, ...previousCommunes];
  }

  return nextCommunes;
}

/**
 * Récupère les communes d'un EPCI
 */
export function getCommunesByEpci(codeEpci: string): CommuneSEO[] {
  return communes.filter((c) => c.codeEpci === codeEpci).sort((a, b) => b.population - a.population);
}

/**
 * Récupère les X communes les plus peuplées d'un EPCI
 */
export function getTopCommunesByEpci(codeEpci: string, limit: number = 8): CommuneSEO[] {
  return getCommunesByEpci(codeEpci).slice(0, limit);
}

/**
 * Récupère tous les EPCI
 */
export function getAllEpcis(): EpciSEO[] {
  return epcis;
}

/**
 * Récupère un EPCI par son slug
 */
export function getEpciBySlug(slug: string): EpciSEO | undefined {
  return epcis.find((e) => e.slug === slug);
}

/**
 * Récupère un EPCI par son code SIREN
 */
export function getEpciBySiren(codeSiren: string): EpciSEO | undefined {
  return epcis.find((e) => e.codeSiren === codeSiren);
}

/**
 * Récupère les EPCI d'un département
 */
export function getEpcisByDepartement(codeDepartement: string): EpciSEO[] {
  return epcis.filter((e) => e.codesDepartements.includes(codeDepartement));
}
