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
 * Récupère les Allers Vers pour un département et/ou un EPCI
 */
export async function getAllersVersByDepartementOrEpci(
  codeDepartement: string,
  codeEpci?: string
): Promise<AllersVers[]> {
  return await allersVersRepository.findByDepartementOrEpci(codeDepartement, codeEpci);
}

/**
 * Récupère un Allers Vers par son ID
 */
export async function getAllersVersById(id: string): Promise<AllersVers | null> {
  return await allersVersRepository.findById(id);
}
