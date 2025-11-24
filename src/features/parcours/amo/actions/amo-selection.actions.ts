"use server";

import { getSession } from "@/features/auth/server";
import { parcoursRepo } from "@/shared/database/repositories";
import { ActionResult } from "@/shared/types/action-result.types";
import { db } from "@/shared/database/client";
import { entreprisesAmo, parcoursAmoValidations } from "@/shared/database/schema";
import { and, eq } from "drizzle-orm";
import { StatutValidationAmo } from "../domain/value-objects";
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

/**
 * Récupérer uniquement l'id et le nom de l'AMO qui a refusé l'accompagnement
 */
export async function getAmoRefusee(): Promise<ActionResult<{ id: string; nom: string } | null>> {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return { success: false, error: "Non connecté" };
    }

    const parcours = await parcoursRepo.findByUserId(session.userId);
    if (!parcours) {
      return { success: false, error: "Parcours non trouvé" };
    }

    const [amoRefusee] = await db
      .select({
        id: entreprisesAmo.id,
        nom: entreprisesAmo.nom,
      })
      .from(parcoursAmoValidations)
      .innerJoin(entreprisesAmo, eq(parcoursAmoValidations.entrepriseAmoId, entreprisesAmo.id))
      .where(
        and(
          eq(parcoursAmoValidations.parcoursId, parcours.id),
          eq(parcoursAmoValidations.statut, StatutValidationAmo.ACCOMPAGNEMENT_REFUSE)
        )
      )
      .limit(1);

    return {
      success: true,
      data: amoRefusee || null,
    };
  } catch (error) {
    console.error("Erreur getAmoRefusee:", error);
    return {
      success: false,
      error: "Erreur lors de la récupération de l'AMO refusée",
    };
  }
}
