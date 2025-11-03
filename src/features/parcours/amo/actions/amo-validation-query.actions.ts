"use server";

import { getSession } from "@/features/auth/server";
import { parcoursRepo } from "@/shared/database/repositories";
import { db } from "@/shared/database/client";
import { eq } from "drizzle-orm";
import {
  parcoursAmoValidations,
  entreprisesAmo,
} from "@/shared/database/schema";
import { ValidationAmoComplete } from "../domain/entities";
import { ActionResult } from "@/shared/types";

/**
 * Récupère la validation AMO complète pour le parcours de l'utilisateur
 */
export async function getValidationAmo(): Promise<
  ActionResult<ValidationAmoComplete | null>
> {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return { success: false, error: "Non connecté" };
    }

    const parcours = await parcoursRepo.findByUserId(session.userId);
    if (!parcours) {
      return { success: false, error: "Parcours non trouvé" };
    }

    const [validation] = await db
      .select({
        id: parcoursAmoValidations.id,
        parcoursId: parcoursAmoValidations.parcoursId,
        statut: parcoursAmoValidations.statut,
        commentaire: parcoursAmoValidations.commentaire,
        choisieAt: parcoursAmoValidations.choisieAt,
        valideeAt: parcoursAmoValidations.valideeAt,
        entrepriseAmo: {
          id: entreprisesAmo.id,
          nom: entreprisesAmo.nom,
          siret: entreprisesAmo.siret,
          departements: entreprisesAmo.departements,
          emails: entreprisesAmo.emails,
          telephone: entreprisesAmo.telephone,
          adresse: entreprisesAmo.adresse,
        },
      })
      .from(parcoursAmoValidations)
      .innerJoin(
        entreprisesAmo,
        eq(parcoursAmoValidations.entrepriseAmoId, entreprisesAmo.id)
      )
      .where(eq(parcoursAmoValidations.parcoursId, parcours.id))
      .limit(1);

    return {
      success: true,
      data: validation || null,
    };
  } catch (error) {
    console.error("Erreur getValidationAmo:", error);
    return {
      success: false,
      error: "Erreur lors de la récupération",
    };
  }
}
