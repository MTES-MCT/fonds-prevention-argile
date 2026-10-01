import { eq } from "drizzle-orm";
import { db } from "@/shared/database/client";
import { entreprisesAmo, parcoursAmoValidations } from "@/shared/database/schema";
import { DSStatus } from "@/shared/domain/value-objects/ds-status.enum";
import type { Step } from "@/shared/domain/value-objects/step.enum";
import { getDossierByStep } from "../../dossiers-ds/services/dossier-ds.service";
import {
  estAmoMandataireFinancier,
  estDossierDepose,
  estFormulaireConfieAAmo,
  estFormulaireGereParAmo,
  type FormulaireExistant,
} from "../domain/value-objects";

export interface EtatFormulaireParAmo {
  /** La création du formulaire de l'étape revient à l'AMO mandataire financier. */
  confie: boolean;
  /** Le formulaire échappe au demandeur (cf. `estFormulaireGereParAmo`). */
  gereParAmo: boolean;
  formulaire: FormulaireExistant | null;
  entrepriseAmoId: string | null;
  amoNom: string | null;
}

/** État courant du mandat financier, lu en base : `false` sans AMO, ou AMO non mandataire. */
export async function aUneAmoMandataireFinancier(parcoursId: string): Promise<boolean> {
  const [validation] = await db
    .select({
      statut: parcoursAmoValidations.statut,
      estMandataireFinancier: parcoursAmoValidations.estMandataireFinancier,
    })
    .from(parcoursAmoValidations)
    .where(eq(parcoursAmoValidations.parcoursId, parcoursId))
    .limit(1);

  return estAmoMandataireFinancier(validation?.statut ?? null, validation?.estMandataireFinancier ?? null);
}

/** Point unique des entrées du prédicat : l'écran et les actions jugent sur les mêmes faits. */
export async function chargerEtatFormulaireParAmo(parcoursId: string, step: Step): Promise<EtatFormulaireParAmo> {
  const [[validation], dossier] = await Promise.all([
    db
      .select({
        statut: parcoursAmoValidations.statut,
        estMandataireFinancier: parcoursAmoValidations.estMandataireFinancier,
        entrepriseAmoId: parcoursAmoValidations.entrepriseAmoId,
        amoNom: entreprisesAmo.nom,
      })
      .from(parcoursAmoValidations)
      .leftJoin(entreprisesAmo, eq(parcoursAmoValidations.entrepriseAmoId, entreprisesAmo.id))
      .where(eq(parcoursAmoValidations.parcoursId, parcoursId))
      .limit(1),
    getDossierByStep(parcoursId, step),
  ]);

  const confie = estFormulaireConfieAAmo(step, validation?.statut ?? null, validation?.estMandataireFinancier ?? null);
  const formulaire: FormulaireExistant | null = dossier
    ? {
        initiePar: dossier.initiePar,
        depose: Boolean(dossier.submittedAt) || estDossierDepose((dossier.dsStatus as DSStatus | null) ?? null),
      }
    : null;

  return {
    confie,
    gereParAmo: estFormulaireGereParAmo(confie, formulaire),
    formulaire,
    entrepriseAmoId: validation?.entrepriseAmoId ?? null,
    amoNom: validation?.amoNom ?? null,
  };
}
