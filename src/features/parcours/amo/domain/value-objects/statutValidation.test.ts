import { describe, it, expect } from "vitest";
import { StatutValidationAmo } from "@/shared/domain/value-objects/statut-validation-amo.enum";
import { estLogementNonEligible } from "./statutValidation";

describe("estLogementNonEligible", () => {
  it("vrai quand l'AMO a refusé (les deux statuts refusés)", () => {
    expect(estLogementNonEligible(StatutValidationAmo.LOGEMENT_NON_ELIGIBLE, false)).toBe(true);
    expect(estLogementNonEligible(StatutValidationAmo.ACCOMPAGNEMENT_REFUSE, false)).toBe(true);
  });

  it("vrai sur une qualification non éligible (Aller-vers ou simulation du demandeur)", () => {
    expect(estLogementNonEligible(null, true)).toBe(true);
    // Une qualification non éligible prime sur une validation AMO encore en attente :
    // le dossier est archivé, on n'affiche pas « nous attendons la réponse de l'AMO ».
    expect(estLogementNonEligible(StatutValidationAmo.EN_ATTENTE, true)).toBe(true);
  });

  it("faux sur un parcours en cours", () => {
    expect(estLogementNonEligible(null, false)).toBe(false);
    expect(estLogementNonEligible(StatutValidationAmo.EN_ATTENTE, false)).toBe(false);
    expect(estLogementNonEligible(StatutValidationAmo.LOGEMENT_ELIGIBLE, false)).toBe(false);
    expect(estLogementNonEligible(StatutValidationAmo.SANS_AMO, false)).toBe(false);
  });
});
