import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/shared/database/client";
import { parcoursAmoValidations } from "@/shared/database/schema";
import { StatutValidationAmo } from "../domain/value-objects/statutValidation";

/**
 * Pose le mandat financier d'une AMO accompagnante, sans jamais écraser une réponse déjà donnée.
 * Point d'écriture unique du rattrapage (script ops, CRON, lecture DN) : `null` y vaut « inconnu ».
 */
export async function renseignerMandatFinancierSiInconnu(parcoursId: string): Promise<boolean> {
  const mises = await db
    .update(parcoursAmoValidations)
    .set({ estMandataireFinancier: true })
    .where(
      and(
        eq(parcoursAmoValidations.parcoursId, parcoursId),
        eq(parcoursAmoValidations.statut, StatutValidationAmo.LOGEMENT_ELIGIBLE),
        isNull(parcoursAmoValidations.estMandataireFinancier)
      )
    )
    .returning({ id: parcoursAmoValidations.id });

  return mises.length > 0;
}
