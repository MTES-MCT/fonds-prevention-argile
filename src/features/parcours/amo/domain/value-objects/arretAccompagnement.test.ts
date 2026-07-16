import { describe, it, expect } from "vitest";
import { DSStatus } from "@/shared/domain/value-objects/ds-status.enum";
import { StatutValidationAmo } from "./statutValidation";
import { peutAnnulerAccompagnement, requiertAccordAmo } from "./arretAccompagnement";

describe("requiertAccordAmo", () => {
  it("exige l'accord quand l'AMO a validé ET est mandataire financier", () => {
    expect(requiertAccordAmo(StatutValidationAmo.LOGEMENT_ELIGIBLE, true)).toBe(true);
  });

  it("n'exige pas l'accord si l'AMO n'est pas mandataire", () => {
    expect(requiertAccordAmo(StatutValidationAmo.LOGEMENT_ELIGIBLE, false)).toBe(false);
  });

  it("traite un mandataire non renseigné (null) comme non-mandataire", () => {
    expect(requiertAccordAmo(StatutValidationAmo.LOGEMENT_ELIGIBLE, null)).toBe(false);
  });

  it("n'exige pas l'accord si l'AMO n'a pas encore validé, même mandataire déclaré", () => {
    expect(requiertAccordAmo(StatutValidationAmo.EN_ATTENTE, true)).toBe(false);
  });
});

describe("peutAnnulerAccompagnement", () => {
  const base = {
    statut: StatutValidationAmo.LOGEMENT_ELIGIBLE,
    demandeArretAt: null,
    eligibiliteDsStatus: null,
  };

  it("autorise l'annulation quand l'AMO est en attente", () => {
    expect(peutAnnulerAccompagnement({ ...base, statut: StatutValidationAmo.EN_ATTENTE })).toBe(true);
  });

  it("autorise l'annulation quand l'AMO a validé", () => {
    expect(peutAnnulerAccompagnement(base)).toBe(true);
  });

  it("bloque si le formulaire d'éligibilité est en instruction", () => {
    expect(peutAnnulerAccompagnement({ ...base, eligibiliteDsStatus: DSStatus.EN_INSTRUCTION })).toBe(false);
  });

  it("autorise encore si le dossier d'éligibilité est déposé mais pas instruit", () => {
    expect(peutAnnulerAccompagnement({ ...base, eligibiliteDsStatus: DSStatus.EN_CONSTRUCTION })).toBe(true);
  });

  it("bloque si une demande d'arrêt est déjà en cours", () => {
    expect(peutAnnulerAccompagnement({ ...base, demandeArretAt: new Date() })).toBe(false);
  });

  it("bloque si le parcours est déjà sans AMO", () => {
    expect(peutAnnulerAccompagnement({ ...base, statut: StatutValidationAmo.SANS_AMO })).toBe(false);
  });

  it("bloque si la demande a été refusée par l'AMO (le demandeur re-choisit)", () => {
    expect(peutAnnulerAccompagnement({ ...base, statut: StatutValidationAmo.LOGEMENT_NON_ELIGIBLE })).toBe(false);
  });
});
