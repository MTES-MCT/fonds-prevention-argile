import { eq } from "drizzle-orm";
import { db } from "@/shared/database/client";
import { parcoursAmoValidations } from "@/shared/database/schema";
import type { ParcoursPrevention } from "@/shared/database/schema/parcours-prevention";
import { dossierDsRepo } from "@/shared/database/repositories";
import { Step } from "@/shared/domain/value-objects/step.enum";
import type { DSStatus } from "@/shared/domain/value-objects/ds-status.enum";
import type { StatutValidationAmo } from "@/shared/domain/value-objects/statut-validation-amo.enum";
import { aRenduSaDecision } from "@/features/parcours/amo/domain/value-objects";
import type { EtatEditionSimulation } from "../domain/value-objects/edition-simulation";
import { estSimulationCorrigeeParAgent } from "./rga-data.service";

/**
 * Rassemble les trois entrées des verrous d'édition. Point unique : l'écran
 * (`getMaSimulation`) et l'action qui écrit (`enregistrerSimulationDemandeurAction`)
 * doivent juger sur exactement les mêmes faits, sinon la barrière serveur diverge de
 * ce que le demandeur voit.
 */
export async function chargerEtatEditionSimulation(parcours: ParcoursPrevention): Promise<EtatEditionSimulation> {
  const [dossiers, [validation]] = await Promise.all([
    dossierDsRepo.findByParcoursId(parcours.id),
    db
      .select({ statut: parcoursAmoValidations.statut })
      .from(parcoursAmoValidations)
      .where(eq(parcoursAmoValidations.parcoursId, parcours.id))
      .limit(1),
  ]);

  const eligibilite = dossiers.find((dossier) => dossier.step === Step.ELIGIBILITE);

  return {
    simulationCorrigeeParAgent: estSimulationCorrigeeParAgent(parcours),
    decisionAmoRendue: aRenduSaDecision((validation?.statut as StatutValidationAmo) ?? null),
    eligibiliteDossierExiste: Boolean(eligibilite),
    eligibiliteDsStatus: (eligibilite?.dsStatus as DSStatus | null) ?? null,
  };
}
