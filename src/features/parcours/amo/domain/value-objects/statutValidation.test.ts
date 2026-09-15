import { describe, it, expect } from "vitest";
import { StatutValidationAmo } from "@/shared/domain/value-objects/statut-validation-amo.enum";
import { estAccompagnementRefuse, estLogementNonEligible, estParcoursSansSuite } from "./statutValidation";

describe("estLogementNonEligible", () => {
  it("vrai quand l'AMO a jugé le logement non éligible", () => {
    expect(estLogementNonEligible(StatutValidationAmo.LOGEMENT_NON_ELIGIBLE, false)).toBe(true);
  });

  it("faux sur un refus d'accompagnement : le demandeur est éligible", () => {
    expect(estLogementNonEligible(StatutValidationAmo.ACCOMPAGNEMENT_REFUSE, false)).toBe(false);
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

describe("estAccompagnementRefuse", () => {
  it("vrai sur le seul statut ACCOMPAGNEMENT_REFUSE", () => {
    expect(estAccompagnementRefuse(StatutValidationAmo.ACCOMPAGNEMENT_REFUSE)).toBe(true);
  });

  it("faux sur tous les autres statuts, inéligibilité comprise", () => {
    expect(estAccompagnementRefuse(StatutValidationAmo.LOGEMENT_NON_ELIGIBLE)).toBe(false);
    expect(estAccompagnementRefuse(StatutValidationAmo.LOGEMENT_ELIGIBLE)).toBe(false);
    expect(estAccompagnementRefuse(StatutValidationAmo.EN_ATTENTE)).toBe(false);
    expect(estAccompagnementRefuse(StatutValidationAmo.SANS_AMO)).toBe(false);
    expect(estAccompagnementRefuse(null)).toBe(false);
  });
});

describe("estParcoursSansSuite", () => {
  it("couvre les deux causes de mise à l'arrêt", () => {
    expect(estParcoursSansSuite(StatutValidationAmo.LOGEMENT_NON_ELIGIBLE, false)).toBe(true);
    expect(estParcoursSansSuite(StatutValidationAmo.ACCOMPAGNEMENT_REFUSE, false)).toBe(true);
    expect(estParcoursSansSuite(null, true)).toBe(true);
  });

  it("faux sur un parcours en cours", () => {
    expect(estParcoursSansSuite(null, false)).toBe(false);
    expect(estParcoursSansSuite(StatutValidationAmo.EN_ATTENTE, false)).toBe(false);
    expect(estParcoursSansSuite(StatutValidationAmo.LOGEMENT_ELIGIBLE, false)).toBe(false);
    expect(estParcoursSansSuite(StatutValidationAmo.SANS_AMO, false)).toBe(false);
  });

  it("les deux causes restent disjointes : jamais de faux message d'inéligibilité", () => {
    const refus = StatutValidationAmo.ACCOMPAGNEMENT_REFUSE;
    expect(estParcoursSansSuite(refus, false)).toBe(true);
    expect(estLogementNonEligible(refus, false)).toBe(false);
    expect(estAccompagnementRefuse(refus)).toBe(true);
  });
});
