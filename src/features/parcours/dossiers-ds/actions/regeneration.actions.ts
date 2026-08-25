"use server";

import { getSession } from "@/features/auth/server";
import type { ActionResult } from "@/shared/types";
import { regenererLienPrefill, type ResultatRegeneration } from "../services/regeneration.service";

/**
 * Secours « ce lien ne fonctionne plus » côté demandeur (ADR-0027).
 * Scopée par la session : le demandeur n'agit que sur son propre parcours.
 */
export async function regenererLienPrefillAction(): Promise<ActionResult<ResultatRegeneration>> {
  const session = await getSession();
  if (!session?.userId) {
    return { success: false, error: "Vous devez être connecté" };
  }

  try {
    return await regenererLienPrefill(session.userId);
  } catch (error) {
    console.error("Erreur regenererLienPrefillAction:", error);
    return { success: false, error: "Erreur lors de la régénération du lien" };
  }
}
