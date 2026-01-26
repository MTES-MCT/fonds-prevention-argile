import { allersVersRepository } from "@/shared/database/repositories";
import type { AllersVers } from "../domain/entities";

/**
 * Service de requêtes pour les Allers Vers
 */

/**
 * Récupère tous les Allers Vers avec leurs relations (admin)
 */
export async function getAllAllersVersWithRelations(): Promise<
  Array<
    AllersVers & {
      departements: { codeDepartement: string }[];
      epci: { codeEpci: string }[];
    }
  >
> {
  return await allersVersRepository.findAllWithRelations();
}

/**
 * Récupère les Allers Vers pour un département
 */
export async function getAllersVersByDepartement(codeDepartement: string): Promise<AllersVers[]> {
  return await allersVersRepository.findByDepartement(codeDepartement);
}

/**
 * Récupère les Allers Vers pour un EPCI
 */
export async function getAllersVersByEpci(codeEpci: string): Promise<AllersVers[]> {
  return await allersVersRepository.findByEpci(codeEpci);
}

/**
 * Récupère les Allers Vers avec priorité EPCI, fallback département
 *
 * Logique :
 * 1. Si l'EPCI est fourni et a des AV → retourne uniquement ceux de l'EPCI
 * 2. Sinon → retourne les AV du département
 * 3. Si aucun → retourne un tableau vide
 */
export async function getAllersVersByEpciWithFallback(
  codeDepartement: string,
  codeEpci?: string
): Promise<AllersVers[]> {
  return await allersVersRepository.findByEpciWithDepartementFallback(codeDepartement, codeEpci);
}

/**
 * Récupère un Allers Vers par son ID
 */
export async function getAllersVersById(id: string): Promise<AllersVers | null> {
  return await allersVersRepository.findById(id);
}
