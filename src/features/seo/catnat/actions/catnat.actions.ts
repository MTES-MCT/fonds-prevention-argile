"use server";

import { catastrophesNaturellesRepository } from "@/shared/database";
import { getEpciBySiren } from "../../services";
import { catnatService } from "../services/catnat.service";
import type { CatastropheNaturelle } from "@/shared/database/schema/catastrophes-naturelles";

/**
 * Récupère les catastrophes naturelles pour une commune
 */
export async function getCatnatForCommuneAction(codeInsee: string): Promise<CatastropheNaturelle[]> {
  try {
    return await catnatService.getForCommune(codeInsee);
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

    const catnats = await catastrophesNaturellesRepository.findByCodesInsee(epci.codesCommunes);
    return catnats.length;
  } catch (error) {
    console.error(`Error fetching CATNAT total for EPCI ${codeSiren}:`, error);
    return 0;
  }
}
