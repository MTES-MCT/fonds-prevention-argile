"use server";

import { getEpciBySiren } from "../../services";
import { catnatService } from "../services/catnat.service";
import type { LigneHistoriqueCatnat } from "../domain";

/**
 * Récupère l'historique des catastrophes naturelles d'une commune, demandes non reconnues comprises
 */
export async function getCatnatForCommuneAction(codeInsee: string): Promise<LigneHistoriqueCatnat[]> {
  try {
    return await catnatService.getHistoriquePourCommune(codeInsee);
  } catch (error) {
    console.error(`Error fetching CATNAT for commune ${codeInsee}:`, error);
    return [];
  }
}

/**
 * Récupère le nombre total de catastrophes naturelles pour un département
 */
export async function getTotalCatnatForDepartementAction(codeDepartement: string): Promise<number> {
  try {
    return await catnatService.getTotalForDepartement(codeDepartement);
  } catch (error) {
    console.error(`Error fetching CATNAT total for department ${codeDepartement}:`, error);
    return 0;
  }
}

/**
 * Récupère les statistiques par type de risque pour une commune
 */
export async function getCatnatStatsByTypeAction(codeInsee: string) {
  try {
    return await catnatService.getStatsByTypeForCommune(codeInsee);
  } catch (error) {
    console.error(`Error fetching CATNAT stats for commune ${codeInsee}:`, error);
    return [];
  }
}

/**
 * Récupère le nombre total de catastrophes naturelles pour un EPCI
 */
export async function getTotalCatnatForEpciAction(codeSiren: string): Promise<number> {
  try {
    // Récupérer les communes de l'EPCI
    const epci = getEpciBySiren(codeSiren);
    if (!epci) return 0;

    // Récupérer le total des catastrophes naturelles pour ces communes
    return await catnatService.getTotalForCommunes(epci.codesCommunes);
  } catch (error) {
    console.error(`Error fetching CATNAT total for EPCI ${codeSiren}:`, error);
    return 0;
  }
}
