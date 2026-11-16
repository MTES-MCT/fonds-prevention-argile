"use server";

import type { ActionResult } from "@/shared/types";
import { avisPayloadSchema } from "../domain/value-objects/avis.schema";
import { enregistrerAvis } from "../services/avis.service";

const ERREUR = "Votre réponse n'a pas pu être enregistrée.";

// Endpoint public : le lien du mail et le simulateur n'exigent aucune connexion.
export async function enregistrerAvisAction(payload: unknown): Promise<ActionResult<{ avisId: string | null }>> {
  const parsed = avisPayloadSchema.safeParse(payload);
  if (!parsed.success) return { success: false, error: ERREUR };

  const { site, ...avis } = parsed.data;
  // Réponse d'apparence normale : un robot n'apprend pas qu'il a été écarté.
  if (site) return { success: true, data: { avisId: null } };

  try {
    const resultat = await enregistrerAvis(avis);
    if (!resultat.enregistre) return { success: false, error: ERREUR };
    return { success: true, data: { avisId: resultat.avisId } };
  } catch (error) {
    // Jamais la charge utile : le commentaire est un texte libre.
    console.error("[enregistrerAvisAction] échec de l'enregistrement", error instanceof Error ? error.message : error);
    return { success: false, error: ERREUR };
  }
}
