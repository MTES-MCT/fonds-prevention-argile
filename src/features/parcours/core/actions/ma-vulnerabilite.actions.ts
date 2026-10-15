"use server";

import { getSession } from "@/features/auth/server";
import type { AdresseChoisie } from "@/shared/adapters/ban";
import type { ActionResult } from "@/shared/types/action-result.types";
import {
  buildResumeVulnerabilite,
  type ResumeVulnerabilite,
} from "@/features/vulnerabilite-rga/domain/services/resume-vulnerabilite.service";
import { getAdresseMaSimulation, getMaVulnerabilite } from "../services/ma-vulnerabilite.service";

export interface EtatMaVulnerabilite {
  /** Null tant que le demandeur n'a pas fait le test, ou qu'il n'est pas rattaché à son compte. */
  resume: (ResumeVulnerabilite & { date: string }) | null;
  /** Adresse de sa simulation d'éligibilité : le test s'ouvre dessus au lieu d'une saisie. */
  adresse: AdresseChoisie | null;
}

/** Ce que l'encart « vulnérabilité » de « Ma liste » affiche, pour le demandeur connecté. */
export async function getEtatMaVulnerabiliteAction(): Promise<ActionResult<EtatMaVulnerabilite>> {
  try {
    const session = await getSession();
    if (!session?.userId) return { success: false, error: "Non connecté" };

    const [vulnerabilite, adresse] = await Promise.all([getMaVulnerabilite(), getAdresseMaSimulation()]);

    return {
      success: true,
      data: {
        resume: vulnerabilite
          ? { ...buildResumeVulnerabilite(vulnerabilite.points), date: vulnerabilite.completedAt.toISOString() }
          : null,
        adresse,
      },
    };
  } catch (error) {
    console.error("[getEtatMaVulnerabiliteAction] échec de lecture", error);
    return { success: false, error: "Erreur lors de la lecture de votre test de vulnérabilité" };
  }
}
