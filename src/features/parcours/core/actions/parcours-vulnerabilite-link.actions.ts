"use server";

import { cookies } from "next/headers";
import { getSession, COOKIE_NAMES } from "@/features/auth/server";
import type { ActionResult } from "@/shared/types";
import { parcoursRepo, vulnerabiliteSimulationsRepo } from "@/shared/database/repositories";

/**
 * Rattrape une simulation de vulnérabilité faite en anonyme, si le demandeur se connecte
 * ensuite dans la même session (cookie httpOnly posé par `enregistrerResultatVulnerabiliteAction`,
 * mirror de `consumeClaimToken`). No-op silencieux dans tous les cas où il n'y a rien à faire —
 * appelée systématiquement à la connexion, pas seulement quand on sait qu'il y a un cookie.
 */
export async function lierSimulationVulnerabiliteAuCompte(): Promise<ActionResult<void>> {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return { success: true, data: undefined };
    }

    const cookieStore = await cookies();
    const simulationId = cookieStore.get(COOKIE_NAMES.VULNERABILITE_SIMULATION_ID)?.value;
    if (!simulationId) {
      return { success: true, data: undefined };
    }

    // Usage unique, comme consumeClaimToken.
    cookieStore.delete(COOKIE_NAMES.VULNERABILITE_SIMULATION_ID);

    const simulation = await vulnerabiliteSimulationsRepo.findById(simulationId);
    if (!simulation) {
      return { success: true, data: undefined };
    }

    const parcours = await parcoursRepo.findByUserId(session.userId);
    if (!parcours) {
      return { success: false, error: "Parcours non trouvé" };
    }

    await parcoursRepo.update(parcours.id, { vulnerabiliteSimulationId: simulation.id });
    return { success: true, data: undefined };
  } catch (error) {
    console.error("[lierSimulationVulnerabiliteAuCompte] Erreur:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur lors du rattachement de la simulation",
    };
  }
}
