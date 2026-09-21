import { eq } from "drizzle-orm";
import { db } from "@/shared/database/client";
import { parcoursAmoValidations } from "@/shared/database/schema";
import { parcoursRepo } from "@/shared/database/repositories";
import { StatutValidationAmo } from "@/shared/domain/value-objects/statut-validation-amo.enum";

/**
 * Ouvre l'étape éligibilité d'un parcours resté à `CHOIX_AMO` alors que son logement est
 * déclaré éligible. Sans elle, ce couple ne rend aucun callout sur `/mon-compte` : le
 * demandeur voit une page muette et son dossier n'avance plus.
 *
 * Le cas naît de la correction de simulation par un agent (`updateSimulationDataAction`),
 * qui fait basculer la validation en `LOGEMENT_ELIGIBLE` sans toucher à l'étape —
 * contrairement à `approveValidation`, qui les déplace ensemble.
 *
 * Idempotent et sans effet sur tout autre état : la règle est relue ici, pour qu'un
 * appelant ne puisse pas faire avancer un parcours dont l'AMO n'a pas statué.
 */
export async function ouvrirEligibiliteApresValidationAmo(parcoursId: string): Promise<boolean> {
  const [validation] = await db
    .select({ statut: parcoursAmoValidations.statut })
    .from(parcoursAmoValidations)
    .where(eq(parcoursAmoValidations.parcoursId, parcoursId))
    .limit(1);

  if (validation?.statut !== StatutValidationAmo.LOGEMENT_ELIGIBLE) {
    return false;
  }

  return parcoursRepo.advanceToEligibiliteFromChoixAmo(parcoursId);
}

/**
 * Une AMO a-t-elle déjà validé ce parcours ? Une validation peut être posée avant que le
 * demandeur ne réclame son compte : annoncer « pas d'AMO » à la création contredirait alors
 * l'évènement de réponse AMO déjà parti.
 */
export async function aUneAmoValidee(parcoursId: string): Promise<boolean> {
  const [validation] = await db
    .select({ statut: parcoursAmoValidations.statut })
    .from(parcoursAmoValidations)
    .where(eq(parcoursAmoValidations.parcoursId, parcoursId))
    .limit(1);

  return validation?.statut === StatutValidationAmo.LOGEMENT_ELIGIBLE;
}
