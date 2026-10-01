"use client";

import { useParcours } from "../context/useParcours";
import type { Step } from "../domain";
import { estDossierDepose, estFormulaireConfieAAmo, estFormulaireGereParAmo } from "../../amo/domain/value-objects";

/**
 * Miroir client de `chargerEtatFormulaireParAmo` : le formulaire de cette étape est porté par
 * l'AMO mandataire financier, le demandeur n'a ni à le créer ni de lien DN à suivre.
 */
export function useFormulaireGereParAmo(step: Step): boolean {
  const { statutAmo, validationAmoComplete, getDossierByStep } = useParcours();

  const confie = estFormulaireConfieAAmo(step, statutAmo, validationAmoComplete?.estMandataireFinancier ?? null);
  const dossier = getDossierByStep(step);

  return estFormulaireGereParAmo(
    confie,
    dossier
      ? { initiePar: dossier.initiePar, depose: Boolean(dossier.submittedAt) || estDossierDepose(dossier.etatDs) }
      : null
  );
}
