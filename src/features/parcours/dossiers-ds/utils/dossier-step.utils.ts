import type { Step } from "../../core/domain/value-objects/step";
import type { DossierDS } from "../domain/entities/dossier-ds";
import type { DSStatus } from "../domain/value-objects/ds-status";

/** Dossier DS rattaché à une étape (ou undefined s'il n'existe pas encore). */
export function getDossierForStep(dossiers: DossierDS[], step: Step): DossierDS | undefined {
  return dossiers.find((d) => d.demarcheEtape === step);
}

/**
 * Statut DS d'une étape, dérivé de SON propre dossier — `null` si l'étape n'a pas
 * encore de dossier. Évite qu'un statut déborde sur l'étape suivante.
 */
export function getStepDsStatus(dossiers: DossierDS[], step: Step | null): DSStatus | null {
  if (!step) return null;
  return getDossierForStep(dossiers, step)?.etatDs ?? null;
}
