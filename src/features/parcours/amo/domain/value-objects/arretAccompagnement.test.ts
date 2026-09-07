import { describe, it, expect } from "vitest";
import { DSStatus } from "@/shared/domain/value-objects/ds-status.enum";
import { Step } from "@/shared/domain/value-objects/step.enum";
import { StatutValidationAmo } from "./statutValidation";
import {
  estFormulaireEligibiliteBloqueParDemandeAccompagnement,
  peutAnnulerAccompagnement,
  peutDemanderAccompagnement,
  requiertAccordAmo,
} from "./arretAccompagnement";

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

  it("bloque dès le dépôt, avant même la prise en instruction", () => {
    // La DDT peut instruire à tout moment un dossier déposé : se détacher lui ferait traiter
    // un dossier déclarant une AMO mandataire qui n'accompagne plus.
    expect(peutAnnulerAccompagnement({ ...base, eligibiliteDsStatus: DSStatus.EN_CONSTRUCTION })).toBe(false);
  });

  it("autorise à nouveau une fois la décision rendue", () => {
    // Ce dossier est soldé : la relation AMO continue sur le diagnostic et les devis.
    for (const statut of [DSStatus.ACCEPTE, DSStatus.REFUSE, DSStatus.CLASSE_SANS_SUITE]) {
      expect(peutAnnulerAccompagnement({ ...base, eligibiliteDsStatus: statut })).toBe(true);
    }
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

describe("peutDemanderAccompagnement", () => {
  const base = {
    statut: StatutValidationAmo.SANS_AMO,
    eligibiliteDsStatus: null,
  };

  it("autorise la demande quand le demandeur est en autonomie", () => {
    expect(peutDemanderAccompagnement(base)).toBe(true);
  });

  it("bloque dès le dépôt : le préremplissage n'est plus corrigeable", () => {
    expect(peutDemanderAccompagnement({ ...base, eligibiliteDsStatus: DSStatus.EN_CONSTRUCTION })).toBe(false);
  });

  it("bloque si le formulaire d'éligibilité est en instruction", () => {
    expect(peutDemanderAccompagnement({ ...base, eligibiliteDsStatus: DSStatus.EN_INSTRUCTION })).toBe(false);
  });

  it("autorise à nouveau une fois la décision rendue", () => {
    for (const statut of [DSStatus.ACCEPTE, DSStatus.REFUSE, DSStatus.CLASSE_SANS_SUITE]) {
      expect(peutDemanderAccompagnement({ ...base, eligibiliteDsStatus: statut })).toBe(true);
    }
  });

  it("autorise si le dossier est créé mais pas déposé (NON_ACCESSIBLE)", () => {
    expect(peutDemanderAccompagnement({ ...base, eligibiliteDsStatus: DSStatus.NON_ACCESSIBLE })).toBe(true);
  });

  it("bloque si le demandeur a déjà un AMO (EN_ATTENTE)", () => {
    expect(peutDemanderAccompagnement({ ...base, statut: StatutValidationAmo.EN_ATTENTE })).toBe(false);
  });

  it("bloque si le demandeur a déjà un AMO (LOGEMENT_ELIGIBLE)", () => {
    expect(peutDemanderAccompagnement({ ...base, statut: StatutValidationAmo.LOGEMENT_ELIGIBLE })).toBe(false);
  });
});

describe("estFormulaireEligibiliteBloqueParDemandeAccompagnement", () => {
  const bloque = estFormulaireEligibiliteBloqueParDemandeAccompagnement;

  it("bloque pendant l'attente de la réponse AMO, formulaire réinitialisé", () => {
    expect(bloque(StatutValidationAmo.EN_ATTENTE, Step.ELIGIBILITE, null)).toBe(true);
  });

  it("ne bloque pas si le dossier a été transmis : rien n'a été réinitialisé", () => {
    // Le reset refuse sur un dossier déposé (`dossier_depose`) : bloquer priverait le
    // demandeur de l'accès à son dossier sans corriger le préremplissage.
    for (const statut of [
      DSStatus.EN_CONSTRUCTION,
      DSStatus.EN_INSTRUCTION,
      DSStatus.ACCEPTE,
      DSStatus.REFUSE,
      DSStatus.CLASSE_SANS_SUITE,
    ]) {
      expect(bloque(StatutValidationAmo.EN_ATTENTE, Step.ELIGIBILITE, statut)).toBe(false);
    }
  });

  it("ne bloque pas hors de l'étape éligibilité ni sur un autre statut AMO", () => {
    expect(bloque(StatutValidationAmo.EN_ATTENTE, Step.CHOIX_AMO, null)).toBe(false);
    expect(bloque(StatutValidationAmo.LOGEMENT_ELIGIBLE, Step.ELIGIBILITE, null)).toBe(false);
    expect(bloque(null, Step.ELIGIBILITE, null)).toBe(false);
  });
});
