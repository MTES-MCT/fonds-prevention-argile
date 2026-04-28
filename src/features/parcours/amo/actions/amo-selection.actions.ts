"use server";

import { getSession } from "@/features/auth/server";
import { parcoursRepo } from "@/shared/database/repositories";
import { ActionResult } from "@/shared/types/action-result.types";
import { db } from "@/shared/database/client";
import { entreprisesAmo, parcoursAmoValidations } from "@/shared/database/schema";
import { eq } from "drizzle-orm";
import { Amo } from "../domain/entities";
import { selectAmoForUser, SelectAmoParams } from "../services/amo-selection.service";

/**
 * Choisir un AMO pour le parcours (étape CHOIX_AMO)
 * Action mince : authentification + délégation au service
 */
export async function choisirAmo(params: SelectAmoParams): Promise<ActionResult<{ message: string; token: string }>> {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return { success: false, error: "Non connecté" };
    }

    return await selectAmoForUser(session.userId, params);
  } catch (error) {
    console.error("Erreur choisirAmo:", error);
    return {
      success: false,
      error: "Erreur lors de la sélection de l'AMO",
    };
  }
}

/**
 * Récupérer uniquement les informations de l'AMO choisie pour le parcours de l'utilisateur
 */
export async function getAmoChoisie(): Promise<ActionResult<Amo | null>> {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return { success: false, error: "Non connecté" };
    }

    const parcours = await parcoursRepo.findByUserId(session.userId);
    if (!parcours) {
      return { success: false, error: "Parcours non trouvé" };
    }

    const [amoChoisie] = await db
      .select({
        id: entreprisesAmo.id,
        nom: entreprisesAmo.nom,
        siret: entreprisesAmo.siret,
        departements: entreprisesAmo.departements,
        emails: entreprisesAmo.emails,
        telephone: entreprisesAmo.telephone,
        adresse: entreprisesAmo.adresse,
      })
      .from(parcoursAmoValidations)
      .innerJoin(entreprisesAmo, eq(parcoursAmoValidations.entrepriseAmoId, entreprisesAmo.id))
      .where(eq(parcoursAmoValidations.parcoursId, parcours.id))
      .limit(1);

    return {
      success: true,
      data: amoChoisie || null,
    };
  } catch (error) {
    console.error("Erreur getAmoChoisie:", error);
    return {
      success: false,
      error: "Erreur lors de la récupération de l'AMO",
    };
  }
}

