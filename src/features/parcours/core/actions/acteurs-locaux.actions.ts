"use server";

import { getSession } from "@/features/auth/server";
import { parcoursRepo } from "@/shared/database/repositories";
import { allersVersRepository } from "@/shared/database/repositories/allers-vers.repository";
import { entreprisesAmoRepository } from "@/shared/database/repositories/entreprises-amo.repository";
import { getCodeDepartementFromCodeInsee, normalizeCodeInsee } from "@/features/parcours/amo/utils/amo.utils";
import type { ActionResult } from "@/shared/types";

export interface ActeursLocaux {
  amos: { id: string; nom: string }[];
  allersVers: { id: string; nom: string }[];
}

/**
 * Récupère les AMO et structures Aller-Vers disponibles sur le territoire du ménage.
 * Retourne des listes vides si l'adresse n'est pas encore connue (avant simulation RGA).
 */
export async function getActeursLocauxDisponibles(): Promise<ActionResult<ActeursLocaux>> {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return { success: false, error: "Non connecté" };
    }

    const parcours = await parcoursRepo.findByUserId(session.userId);

    if (!parcours?.rgaSimulationData?.logement?.commune) {
      return { success: true, data: { amos: [], allersVers: [] } };
    }

    const codeInsee = normalizeCodeInsee(parcours.rgaSimulationData.logement.commune);
    if (!codeInsee) {
      return { success: true, data: { amos: [], allersVers: [] } };
    }

    const codeDepartement = getCodeDepartementFromCodeInsee(codeInsee);
    const codeEpci = parcours.rgaSimulationData.logement?.epci
      ? String(parcours.rgaSimulationData.logement.epci).trim()
      : undefined;

    const [amos, allersVers] = await Promise.all([
      entreprisesAmoRepository.findByCodeInsee(codeInsee, codeDepartement),
      allersVersRepository.findByEpciWithDepartementFallback(codeDepartement, codeEpci),
    ]);

    return {
      success: true,
      data: {
        amos: amos.map(({ id, nom }) => ({ id, nom })),
        allersVers: allersVers.map(({ id, nom }) => ({ id, nom })),
      },
    };
  } catch (error) {
    console.error("Erreur getActeursLocauxDisponibles:", error);
    return { success: false, error: "Erreur lors de la récupération des acteurs locaux" };
  }
}
