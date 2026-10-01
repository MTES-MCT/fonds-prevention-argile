import { describe, it, expect } from "vitest";
import { Step } from "@/shared/domain/value-objects/step.enum";
import { INITIATEUR_FORMULAIRE } from "@/shared/domain/value-objects/initiateur-formulaire.enum";
import { StatutValidationAmo } from "./statutValidation";
import { estFormulaireConfieAAmo, estFormulaireGereParAmo } from "./formulaire-par-amo";

describe("estFormulaireConfieAAmo", () => {
  it("confie le diagnostic à l'AMO qui a validé ET est mandataire financier", () => {
    expect(estFormulaireConfieAAmo(Step.DIAGNOSTIC, StatutValidationAmo.LOGEMENT_ELIGIBLE, true)).toBe(true);
  });

  it("laisse le formulaire au demandeur si l'AMO n'est pas mandataire financier", () => {
    expect(estFormulaireConfieAAmo(Step.DIAGNOSTIC, StatutValidationAmo.LOGEMENT_ELIGIBLE, false)).toBe(false);
  });

  it("traite un mandataire non renseigné (null) comme non-mandataire", () => {
    expect(estFormulaireConfieAAmo(Step.DIAGNOSTIC, StatutValidationAmo.LOGEMENT_ELIGIBLE, null)).toBe(false);
  });

  it("laisse le formulaire au demandeur en autonomie ou sans validation", () => {
    expect(estFormulaireConfieAAmo(Step.DIAGNOSTIC, StatutValidationAmo.SANS_AMO, true)).toBe(false);
    expect(estFormulaireConfieAAmo(Step.DIAGNOSTIC, null, true)).toBe(false);
  });

  it.each([Step.ELIGIBILITE, Step.DEVIS, Step.FACTURES])("ne concerne pas l'étape %s", (step) => {
    expect(estFormulaireConfieAAmo(step, StatutValidationAmo.LOGEMENT_ELIGIBLE, true)).toBe(false);
  });
});

describe("estFormulaireGereParAmo", () => {
  const parAmo = { initiePar: INITIATEUR_FORMULAIRE.AMO, depose: false };
  const parDemandeur = { initiePar: INITIATEUR_FORMULAIRE.DEMANDEUR, depose: false };

  it("suit la règle d'attribution tant qu'aucun formulaire n'existe", () => {
    expect(estFormulaireGereParAmo(true, null)).toBe(true);
    expect(estFormulaireGereParAmo(false, null)).toBe(false);
  });

  it("retire au demandeur son brouillon non déposé : l'AMO le réinitialise et initie le sien", () => {
    expect(estFormulaireGereParAmo(true, parDemandeur)).toBe(true);
  });

  it("laisse au demandeur le dossier qu'il a déjà déposé", () => {
    expect(estFormulaireGereParAmo(true, { ...parDemandeur, depose: true })).toBe(false);
  });

  it("ne touche pas au brouillon du demandeur quand l'AMO n'est pas mandataire financier", () => {
    expect(estFormulaireGereParAmo(false, parDemandeur)).toBe(false);
  });

  it("retire au demandeur le formulaire initié par son AMO", () => {
    expect(estFormulaireGereParAmo(true, parAmo)).toBe(true);
  });

  it("garde hors de portée un dossier déposé par l'AMO, même détachée depuis", () => {
    expect(estFormulaireGereParAmo(false, { ...parAmo, depose: true })).toBe(true);
  });

  it("rend la main au demandeur si l'AMO est détachée avant d'avoir déposé", () => {
    expect(estFormulaireGereParAmo(false, parAmo)).toBe(false);
  });
});
