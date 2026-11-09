import { Step } from "@/shared/domain/value-objects/step.enum";
import type { StatutValidationAmo } from "@/shared/domain/value-objects/statut-validation-amo.enum";
import { STATUTS_REFUSES } from "@/features/backoffice/espace-agent/dossiers/domain/types/amo-dossiers.types";

export const NOMBRE_DEMANDEURS_PROCHES = 5;

// Un dossier créé par un Aller-vers reste à « invitation » jusqu'au rattachement du demandeur.
const ETAPES_AMO: readonly Step[] = [Step.INVITATION, Step.CHOIX_AMO];

const ETAPES_PROPOSEES: Record<Step, readonly Step[]> = {
  [Step.INVITATION]: ETAPES_AMO,
  [Step.CHOIX_AMO]: ETAPES_AMO,
  [Step.ELIGIBILITE]: [Step.ELIGIBILITE, ...ETAPES_AMO],
  [Step.DIAGNOSTIC]: [Step.DIAGNOSTIC, Step.ELIGIBILITE],
  [Step.DEVIS]: [],
  [Step.FACTURES]: [],
};

const LIBELLE_ETAPES: Partial<Record<Step, string>> = {
  [Step.INVITATION]: "au choix de l'AMO",
  [Step.CHOIX_AMO]: "au choix de l'AMO",
  [Step.ELIGIBILITE]: "en éligibilité ou au choix de l'AMO",
  [Step.DIAGNOSTIC]: "au diagnostic ou en éligibilité",
};

export function libelleEtapesProposees(step: Step): string {
  return LIBELLE_ETAPES[step] ?? "";
}

/** Étapes des voisins proposés : celle du dossier consulté et celle juste avant. */
export function etapesProposees(step: Step): readonly Step[] {
  return ETAPES_PROPOSEES[step];
}

export function estStatutRefuse(statut: StatutValidationAmo | null): boolean {
  return statut !== null && STATUTS_REFUSES.includes(statut);
}

/** Aucune visite ne se prépare sur un dossier archivé, refusé, ou trop avancé. */
export function encartAffiche(dossier: {
  step: Step;
  archivedAt: Date | null;
  validationStatut: StatutValidationAmo | null;
}): boolean {
  return (
    etapesProposees(dossier.step).length > 0 &&
    dossier.archivedAt === null &&
    !estStatutRefuse(dossier.validationStatut)
  );
}
