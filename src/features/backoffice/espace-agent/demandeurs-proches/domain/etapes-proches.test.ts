import { describe, expect, it } from "vitest";
import { Step } from "@/shared/domain/value-objects/step.enum";
import { StatutValidationAmo } from "@/shared/domain/value-objects/statut-validation-amo.enum";
import { encartAffiche, etapesProposees } from "./etapes-proches";

describe("etapesProposees", () => {
  it("propose l'étape AMO pour un dossier à l'étape AMO", () => {
    expect(etapesProposees(Step.CHOIX_AMO)).toEqual([Step.INVITATION, Step.CHOIX_AMO]);
    expect(etapesProposees(Step.INVITATION)).toEqual([Step.INVITATION, Step.CHOIX_AMO]);
  });

  it("propose l'éligibilité et l'étape AMO pour un dossier en éligibilité", () => {
    expect(etapesProposees(Step.ELIGIBILITE)).toEqual([Step.ELIGIBILITE, Step.INVITATION, Step.CHOIX_AMO]);
  });

  it("propose le diagnostic et l'éligibilité pour un dossier au diagnostic", () => {
    expect(etapesProposees(Step.DIAGNOSTIC)).toEqual([Step.DIAGNOSTIC, Step.ELIGIBILITE]);
  });

  it.each([Step.DEVIS, Step.FACTURES])("ne propose rien à l'étape %s", (step) => {
    expect(etapesProposees(step)).toEqual([]);
  });
});

describe("encartAffiche", () => {
  const actif = { step: Step.DIAGNOSTIC, archivedAt: null, validationStatut: StatutValidationAmo.LOGEMENT_ELIGIBLE };

  it("s'affiche sur un dossier actif à une étape couverte", () => {
    expect(encartAffiche(actif)).toBe(true);
    expect(encartAffiche({ ...actif, validationStatut: null })).toBe(true);
  });

  it("ne s'affiche ni aux devis, ni sur un dossier archivé", () => {
    expect(encartAffiche({ ...actif, step: Step.DEVIS })).toBe(false);
    expect(encartAffiche({ ...actif, archivedAt: new Date() })).toBe(false);
  });

  it.each([StatutValidationAmo.LOGEMENT_NON_ELIGIBLE, StatutValidationAmo.ACCOMPAGNEMENT_REFUSE])(
    "ne s'affiche pas sur un dossier %s",
    (validationStatut) => {
      expect(encartAffiche({ ...actif, validationStatut })).toBe(false);
    }
  );
});
