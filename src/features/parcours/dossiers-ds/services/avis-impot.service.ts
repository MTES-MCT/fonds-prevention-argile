import { graphqlClient } from "../adapters/graphql/client";
import type { DonneesAvisImpotDossier } from "../domain/avis-impot";
import { mapDossierAvisImpot } from "../mappers/avis-impot.mapper";

/** Contient des données fiscales : ne jamais journaliser le résultat. */
export async function lireAvisImpotDossier(numero: number): Promise<DonneesAvisImpotDossier | null> {
  const dossier = await graphqlClient.getDossierAvisImpot(numero);
  return dossier ? mapDossierAvisImpot(dossier) : null;
}
